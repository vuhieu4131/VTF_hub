import React, { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { documentListState } from "../state";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Document } from "../types/document";

export const FirebaseSync: React.FC = () => {
  const setDocs = useSetRecoilState(documentListState);

  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const documentsData: Document[] = [];
      snapshot.forEach((doc) => {
        documentsData.push({ id: doc.id, ...doc.data() } as Document);
      });
      setDocs(documentsData);
    }, (error) => {
      console.error("Error fetching documents from Firestore:", error);
    });

    return () => unsubscribe();
  }, [setDocs]);

  return null;
};
