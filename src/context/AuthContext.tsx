import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { createUserProfile, getUserProfile } from "../services/userService";
import type { UserProfile } from "../types/userProfile";

const ALLOWED_EMAIL_DOMAIN = "@jhmc.org";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function validateHospitalEmail(email: string) {
  if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed.`);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(email: string, password: string) {
    validateHospitalEmail(email);
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signup(email: string, password: string) {
    validateHospitalEmail(email);

    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const createdProfile = await createUserProfile({
      uid: credential.user.uid,
      email: credential.user.email || email,
      role: "Resident",
    });

    setProfile(createdProfile);
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        setUser(firebaseUser);

        if (firebaseUser) {
          let userProfile = await getUserProfile(firebaseUser.uid);

          if (!userProfile) {
            userProfile = await createUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "Resident",
            });
          }

          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}