import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { localDB } from '../lib/localDB';
import type { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  activeBranchId: string | null;
  /** True when the user's subscription plan has expired */
  planExpired: boolean;
  /** Recheck the plan from Firestore (call after reconnecting to internet) */
  recheckPlan: () => Promise<void>;
  setActiveBranchId: (branchId: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, shopName: string, locationData: { country: string; state: string; district: string; address: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
  clearError: () => void;
}

/** Check if the plan expiry date has passed */
function isPlanExpired(profile: UserProfile | null): boolean {
  if (!profile?.planExpiry) return false; // no expiry = unlimited
  return new Date(profile.planExpiry) < new Date();
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen to Firebase auth state changes automatically
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        let profile = await localDB.getGlobalDocument<UserProfile>('user_profiles', user.uid);

        if (!profile) {
          // New owner registration
          profile = {
            uid: user.uid,
            tenantId: user.uid,
            role: 'admin',
            name: user.email?.split('@')[0] || 'Admin',
            email: user.email || '',
            createdAt: new Date().toISOString()
          };
          await localDB.setGlobalDocument('user_profiles', user.uid, profile);
        }

        localDB.setUserId(profile.tenantId);
        set({
          user,
          profile,
          planExpired: isPlanExpired(profile),
          activeBranchId: profile.assignedBranchId || null,
          loading: false,
          initialized: true
        });
      } catch (err) {
        console.error("Error fetching user profile", err);
        // If offline and we have a cached user, allow app access
        localDB.setUserId(user.uid);
        set({ user, profile: null, planExpired: false, loading: false, initialized: true });
      }
    } else {
      localDB.setUserId(null);
      set({ user: null, profile: null, planExpired: false, activeBranchId: null, loading: false, initialized: true });
    }
  });

  return {
    user: null,
    profile: null,
    loading: true,
    error: null,
    initialized: false,
    activeBranchId: null,
    planExpired: false,

    recheckPlan: async () => {
      const { user } = get();
      if (!user) return;
      try {
        const profile = await localDB.getGlobalDocument<UserProfile>('user_profiles', user.uid);
        if (profile) {
          set({ profile, planExpired: isPlanExpired(profile) });
        }
      } catch (err) {
        console.error('recheckPlan failed:', err);
      }
    },

    setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),

    signIn: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        const profile = await localDB.getGlobalDocument<UserProfile>('user_profiles', user.uid);
        const now = new Date().toISOString();

        if (profile) {
          // Update lastLoginAt so the Admin dashboard "Last Active" column stays current
          await localDB.updateGlobalDocument('user_profiles', user.uid, { lastLoginAt: now });
          const updatedProfile = { ...profile, lastLoginAt: now };
          localDB.setUserId(profile.tenantId);
          set({
            user,
            profile: updatedProfile,
            planExpired: isPlanExpired(updatedProfile),
            activeBranchId: updatedProfile.assignedBranchId || null,
            initialized: true,
            loading: false
          });
        } else {
          // If no profile exists yet, create a default admin profile
          const newProfile: UserProfile = {
            uid: user.uid,
            tenantId: user.uid,
            role: 'admin',
            name: user.email?.split('@')[0] || 'Admin',
            email: user.email || '',
            createdAt: now,
            lastLoginAt: now
          };
          await localDB.setGlobalDocument('user_profiles', user.uid, newProfile);
          localDB.setUserId(newProfile.tenantId);
          set({
            user,
            profile: newProfile,
            planExpired: false,
            activeBranchId: null,
            initialized: true,
            loading: false
          });
        }
      } catch (err: unknown) {
        const message = getFirebaseErrorMessage(err as { code?: string });
        set({ loading: false, error: message });
        throw new Error(message);
      }
    },

    signUp: async (email: string, password: string, name: string, shopName: string, locationData: { country: string; state: string; district: string; address: string; phone: string }) => {
      set({ loading: true, error: null });
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(user);

        // Set 15-day free trial
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 15);

        // Immediately create the user profile with the provided name
        const profile: UserProfile = {
          uid: user.uid,
          tenantId: user.uid,
          role: 'admin',
          name: name,
          email: email,
          phone: locationData.phone,
          plan: 'Trial',
          planExpiry: trialExpiry.toISOString(),
          createdAt: new Date().toISOString()
        };
        await localDB.setGlobalDocument('user_profiles', user.uid, profile);

        // Initialize shop settings with the provided shop name
        localDB.setUserId(user.uid);

        const initialSettings = {
          shopName: shopName,
          ownerName: name,
          email: email,
          country: locationData.country,
          state: locationData.state,
          district: locationData.district,
          address: locationData.address,
          phone: locationData.phone,
          gstin: '',
          logo: '',
          currency: '₹',
          metalRates: {
            'Gold': 6500,
            'Silver': 80,
            'Diamond': 50000,
            'Platinum': 3500
          },
          goldRate: 6500,
          silverRate: 80,
          platinumRate: 3500,
          cgstPercent: 1.5,
          sgstPercent: 1.5,
          igstPercent: 3.0,
          enableLoyalty: true,
          loyaltyPointsPerRupee: 10,
          loyaltyRedemptionRate: 1,
          invoicePrefix: `AUR-${new Date().getFullYear()}-`,
          invoiceCounter: 1,
          receiptFooter: `Thank you for choosing ${shopName}. Visit again!`,
          theme: 'dark',
        };

        await localDB.setDocument('settings', 'global_settings', initialSettings);

        set({
          user,
          profile,
          planExpired: false,
          activeBranchId: null,
          initialized: true,
          loading: false
        });
      } catch (err: unknown) {
        const message = getFirebaseErrorMessage(err as { code?: string });
        set({ loading: false, error: message });
        throw new Error(message);
      }
    },

    signOut: async () => {
      set({ loading: true, error: null });
      try {
        await firebaseSignOut(auth);
        localDB.setUserId(null);
        set({ loading: false, user: null, profile: null, planExpired: false });
      } catch (err: unknown) {
        const message = getFirebaseErrorMessage(err as { code?: string });
        set({ loading: false, error: message });
      }
    },

    resendVerification: async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        set({ loading: true, error: null });
        try {
          await sendEmailVerification(currentUser);
          set({ loading: false });
        } catch (err: unknown) {
          const message = getFirebaseErrorMessage(err as { code?: string });
          set({ loading: false, error: message });
          throw new Error(message);
        }
      } else {
        throw new Error("No user currently authenticated.");
      }
    },

    reloadUser: async () => {
      // Get the real user from firebase auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        set({ loading: true, error: null });
        try {
          await currentUser.reload();
          // Set the user to the updated auth.currentUser, and trigger re-render by changing loading
          set({ loading: false, user: auth.currentUser });
        } catch (err: unknown) {
          const message = getFirebaseErrorMessage(err as { code?: string });
          set({ loading: false, error: message });
        }
      }
    },

    clearError: () => set({ error: null }),
  };
});

// Translate Firebase error codes into human-friendly messages
function getFirebaseErrorMessage(err: { code?: string }): string {
  switch (err?.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
