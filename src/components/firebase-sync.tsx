import React, { useEffect } from "react";
import { useSetRecoilState, useRecoilValueLoadable } from "recoil";
import { documentListState, currentUserState, userListState, statisticsPermissionsState, customPermissionsState, userState } from "../state";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Document, User } from "../types/document";

export const FirebaseSync: React.FC = () => {
  const setDocs = useSetRecoilState(documentListState);
  const setCurrentUser = useSetRecoilState(currentUserState);
  const setUserList = useSetRecoilState(userListState);
  const setStatsPermissions = useSetRecoilState(statisticsPermissionsState);
  const setCustomPermissions = useSetRecoilState(customPermissionsState);
  const userLoadable = useRecoilValueLoadable(userState);

  useEffect(() => {
    let unsubscribeDocs: () => void;
    let unsubscribeUsers: () => void;
    let unsubscribeSettings: () => void;
    let unsubscribePermissions: () => void;

    // Sync Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser(userData);
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

        unsubscribePermissions = onSnapshot(doc(db, "settings", "customPermissions"), (doc) => {
           if (doc.exists() && doc.data().permissions) {
              setCustomPermissions(doc.data().permissions);
           } else {
              setCustomPermissions([
                { id: 'schedule', name: 'Quyền lên lịch', allowedUserIds: [], isSystem: true },
                { id: 'events', name: 'Quyền tạo sự kiện (Thông báo)', allowedUserIds: [], isSystem: true },
                { id: 'leave', name: 'Quyền cập nhật nghỉ phép', allowedUserIds: [], isSystem: true }
              ]);
           }
        });

      } else {
        setCurrentUser(null);
        setDocs([]);
        setUserList([]);
        setStatsPermissions({});
        setCustomPermissions([]);
        // Stop syncing if logged out
        if (unsubscribeDocs) unsubscribeDocs();
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeSettings) unsubscribeSettings();
        if (unsubscribePermissions) unsubscribePermissions();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDocs) unsubscribeDocs();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribePermissions) unsubscribePermissions();
    };
  }, [setDocs, setCurrentUser, setUserList]);

  return null;
};

