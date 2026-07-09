import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import {
  createUserProfile,
  findApprovedPersonByEmail,
  getUserProfile,
  repairUserProfileLink,
  updateUserLoginState,
} from "../services/userService";
import type { UserProfile } from "../types/userProfile";

const ALLOWED_EMAIL_DOMAIN = "@jhmc.org";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateHospitalEmail(email: string) {
  if (!normalizeEmail(email).endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} emails are allowed.`);
  }
}

function formatLoginProblem(parts: string[]) {
  return `Unable to sign in:\n\n${parts.map((item) => `• ${item}`).join("\n")}`;
}

function withLoginState(profile: UserProfile): UserProfile {
  return {
    ...profile,
    emailVerified: true,
    lastLogin: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(email: string, password: string) {
    const cleanEmail = normalizeEmail(email);
    validateHospitalEmail(cleanEmail);

    const credential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );

    await reload(credential.user);

    const problems: string[] = [];

    let approvedPerson: Awaited<
      ReturnType<typeof findApprovedPersonByEmail>
    > | null = null;

    try {
      approvedPerson = await findApprovedPersonByEmail(cleanEmail);
    } catch (err) {
      problems.push(
        err instanceof Error
          ? err.message
          : "Your email is not listed in Residents or Attendings."
      );
    }

    let userProfile = await getUserProfile(credential.user.uid);

    if (!userProfile && approvedPerson) {
      userProfile = await createUserProfile({
        uid: credential.user.uid,
        email: cleanEmail,
        displayName: approvedPerson.displayName,
        role: approvedPerson.role,
        residentId: approvedPerson.residentId,
        attendingId: approvedPerson.attendingId,
        emailVerified: credential.user.emailVerified,
      });
    }

    if (
      userProfile &&
      approvedPerson &&
      !userProfile.residentId &&
      !userProfile.attendingId
    ) {
      await repairUserProfileLink(credential.user.uid, {
        displayName: approvedPerson.displayName,
        role: approvedPerson.role,
        residentId: approvedPerson.residentId,
        attendingId: approvedPerson.attendingId,
        emailVerified: credential.user.emailVerified,
      });

      userProfile = await getUserProfile(credential.user.uid);
    }

    if (!credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user);
      } catch {
        // Firebase may block frequent duplicate verification sends.
      }

      problems.push(
        "Your hospital email is not verified yet. I sent another verification email. Please open the newest verification email, verify once, then sign in again."
      );
    }

    if (!userProfile) {
      problems.push("No app user profile was found for this Firebase account.");
    } else {
      if (!userProfile.active) {
        problems.push("Your app user profile is inactive.");
      }

      if (!userProfile.approved) {
        problems.push("Your app user profile is not approved.");
      }

      if (!userProfile.residentId && !userProfile.attendingId) {
        problems.push(
          "Your app user profile is not linked to a resident or attending profile."
        );
      }
    }

    if (problems.length > 0 || !userProfile) {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      throw new Error(formatLoginProblem(problems));
    }

    const updatedProfile = withLoginState(userProfile);

    await updateUserLoginState(credential.user.uid, {
      emailVerified: true,
      lastLogin: updatedProfile.lastLogin,
    });

    setUser(credential.user);
    setProfile(updatedProfile);
  }

  async function signup(email: string, password: string) {
    const cleanEmail = normalizeEmail(email);
    validateHospitalEmail(cleanEmail);

    const approvedPerson = await findApprovedPersonByEmail(cleanEmail);

    const credential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );

    await createUserProfile({
      uid: credential.user.uid,
      email: cleanEmail,
      displayName: approvedPerson.displayName,
      role: approvedPerson.role,
      residentId: approvedPerson.residentId,
      attendingId: approvedPerson.attendingId,
      emailVerified: credential.user.emailVerified,
    });

    await sendEmailVerification(credential.user);
    await signOut(auth);

    throw new Error(
      "Account created. Please check your hospital email and verify your account before signing in."
    );
  }

  async function resetPassword(email: string) {
    const cleanEmail = normalizeEmail(email);
    validateHospitalEmail(cleanEmail);

    await findApprovedPersonByEmail(cleanEmail);
    await sendPasswordResetEmail(auth, cleanEmail);
  }

  async function resendVerification(email: string, password: string) {
    const cleanEmail = normalizeEmail(email);
    validateHospitalEmail(cleanEmail);

    await findApprovedPersonByEmail(cleanEmail);

    const credential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );

    await reload(credential.user);

    if (credential.user.emailVerified) {
      await signOut(auth);
      throw new Error("This email is already verified. Please sign in normally.");
    }

    await sendEmailVerification(credential.user);
    await signOut(auth);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);

        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          return;
        }

        await reload(firebaseUser);

        if (!firebaseUser.emailVerified) {
          setUser(null);
          setProfile(null);
          await signOut(auth);
          return;
        }

        const userProfile = await getUserProfile(firebaseUser.uid);

        if (!userProfile || !userProfile.active || !userProfile.approved) {
          setUser(null);
          setProfile(null);
          await signOut(auth);
          return;
        }

        const updatedProfile = withLoginState(userProfile);

        await updateUserLoginState(firebaseUser.uid, {
          emailVerified: true,
          lastLogin: updatedProfile.lastLogin,
        });

        setUser(firebaseUser);
        setProfile(updatedProfile);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        resetPassword,
        resendVerification,
        logout,
      }}
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