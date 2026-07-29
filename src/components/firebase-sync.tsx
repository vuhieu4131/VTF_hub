import React, { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { documentListState, currentUserState, userListState, statisticsPermissionsState, allowedScheduleManagersState } from "../state";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Document, User } from "../types/document";

export const FirebaseSync: React.FC = () => {
  const setDocs = useSetRecoilState(documentListState);
  const setCurrentUser = useSetRecoilState(currentUserState);
  const setUserList = useSetRecoilState(userListState);
  const setStatsPermissions = useSetRecoilState(statisticsPermissionsState);
  const setAllowedScheduleManagers = useSetRecoilState(allowedScheduleManagersState);

  useEffect(() => {
    let unsubscribeDocs: () => void;
    let unsubscribeUsers: () => void;
    let unsubscribeSettings: () => void;
    let unsubscribeSchedule: () => void;

    // Sync Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as User);
        } else {
          setCurrentUser(null);
        }

        // ONLY start syncing when authenticated to avoid Permission Denied errors
        const qDocs = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
          const documentsData: Document[] = [];
          snapshot.forEach((doc) => {
            documentsData.push({ id: doc.id, ...doc.data() } as Document);
          });
          setDocs(documentsData);
        }, (error) => {
          console.error("Error fetching documents:", error);
        });

        unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
          const usersData: User[] = [];
          snapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() } as User);
          });
          setUserList(usersData);
        }, (error) => {
          console.error("Error fetching users:", error);
        });

        unsubscribeSettings = onSnapshot(doc(db, "settings", "statisticsPermissions"), (doc) => {
           if (doc.exists()) {
              setStatsPermissions(doc.data() as any);
           } else {
              setStatsPermissions({});
           }
        });

        unsubscribeSchedule = onSnapshot(doc(db, "settings", "schedulePermissions"), (doc) => {
           if (doc.exists() && doc.data().allowedManagers) {
              setAllowedScheduleManagers(doc.data().allowedManagers);
           } else {
              setAllowedScheduleManagers([]);
           }
        });

      } else {
        setCurrentUser(null);
        setDocs([]);
        setUserList([]);
        setStatsPermissions({});
        setAllowedScheduleManagers([]);
        // Stop syncing if logged out
        if (unsubscribeDocs) unsubscribeDocs();
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeSettings) unsubscribeSettings();
        if (unsubscribeSchedule) unsubscribeSchedule();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDocs) unsubscribeDocs();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeSchedule) unsubscribeSchedule();
    };
  }, [setDocs, setCurrentUser, setUserList]);

  return null;
};

