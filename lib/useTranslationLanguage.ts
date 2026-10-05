"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { normalizeTranslationLanguage, resolveTranslationLanguage, type TranslationLanguage } from "@/lib/translationLanguage";

export function useTranslationLanguage(uid: string | null) {
  const [browserLanguage, setBrowserLanguage] = useState<TranslationLanguage>("en");
  useEffect(() => {
    const update = () => setBrowserLanguage(resolveTranslationLanguage(null, navigator.languages?.length ? navigator.languages : [navigator.language]));
    update();
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  const [state, setState] = useState<{ uid: string | null; preference: unknown; ready: boolean }>({ uid: null, preference: null, ready: false });
  useEffect(() => {
    if (!uid) {
      setState({ uid: null, preference: null, ready: true });
      return;
    }
    return onSnapshot(doc(firestore, "users", uid), (snap) => {
      setState({ uid, preference: snap.data()?.preferredTranslationLanguage, ready: true });
    }, () => {
      // Do not spend a translation in an unintended language if the profile cannot load.
      setState({ uid, preference: null, ready: false });
    });
  }, [uid]);
  const preference = state.uid === uid ? normalizeTranslationLanguage(state.preference) : null;
  return {
    preference,
    browserLanguage,
    targetLang: preference ?? browserLanguage,
    ready: state.uid === uid && state.ready,
  };
}
