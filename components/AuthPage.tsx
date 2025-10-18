/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
// FIX: The createUserWithEmailAndPassword and signInWithEmailAndPassword members are not exported from 'firebase/auth'.
// Using the compat library and v8 namespaced syntax instead.


interface AuthPageProps {}

const primaryButtonClasses = "font-permanent-marker text-base sm:text-xl text-center text-cyan-300 bg-cyan-900/20 border-2 border-cyan-400 py-2 px-5 sm:py-3 sm:px-8 rounded-sm transform transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_theme(colors.cyan.400)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:rotate-0 disabled:hover:shadow-none";

const AuthForm = ({
    isLogin,
    onSubmit,
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    error,
}: {
    isLogin: boolean;
    onSubmit: (e: React.FormEvent) => void;
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    isLoading: boolean;
    error: string | null;
}) => {
    return (
        // @ts-ignore
        <motion.div
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 50 : -50 }}
            transition={{ type: 'tween', duration: 0.4 }}
            className="w-full"
        >
            <form onSubmit={onSubmit} className="flex flex-col gap-8">
                <h2 className="font-permanent-marker text-2xl sm:text-3xl text-center text-neutral-200 -mb-2">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <div className="relative">
                    <input
                        type="email"
                        id="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full px-0 py-2.5 text-base sm:text-lg text-white bg-transparent border-0 border-b-2 border-neutral-600 appearance-none focus:outline-none focus:ring-0 focus:border-cyan-400 transition-colors duration-300 peer"
                        placeholder=" " // Required for the label animation
                    />
                    <label htmlFor="email" className="absolute text-base sm:text-lg text-neutral-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-cyan-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        Email Address
                    </label>
                </div>
                <div className="relative">
                    <input
                        type="password"
                        id="password"
                        required
                        minLength={6}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-0 py-2.5 text-base sm:text-lg text-white bg-transparent border-0 border-b-2 border-neutral-600 appearance-none focus:outline-none focus:ring-0 focus:border-cyan-400 transition-colors duration-300 peer"
                        placeholder=" "
                    />
                    <label htmlFor="password" className="absolute text-base sm:text-lg text-neutral-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-cyan-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                        Password
                    </label>
                </div>
                {error && <p className="text-red-400 text-sm text-center -mt-4">{error}</p>}
                <button type="submit" className={`${primaryButtonClasses} mt-4`} disabled={isLoading}>
                    {isLoading ? (isLogin ? 'Logging in...' : 'Signing Up...') : (isLogin ? 'Login' : 'Sign Up')}
                </button>
            </form>
        </motion.div>
    );
};


const AuthPage: React.FC<AuthPageProps> = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isEmailLoading, setIsEmailLoading] = useState(false);

    const handleFirebaseError = (err: any): string => {
        console.error("Firebase Auth Error:", err.code, err.message);
        switch (err.code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/operation-not-allowed':
                return 'This sign-in method is not enabled. Please contact support.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsEmailLoading(true);
        setError(null);
        try {
            if (isLogin) {
                // FIX: Replaced signInWithEmailAndPassword(auth, ...) with auth.signInWithEmailAndPassword(...)
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                // FIX: Replaced createUserWithEmailAndPassword(auth, ...) with auth.createUserWithEmailAndPassword(...)
                await auth.createUserWithEmailAndPassword(email, password);
            }
            // onAuthStateChanged in App.tsx will handle the redirect
        } catch (err) {
            setError(handleFirebaseError(err));
        } finally {
            setIsEmailLoading(false);
        }
    };

    return (
        // @ts-ignore
        <motion.div
            key="auth-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0"
        >
             <div className="text-center mb-10">
                <h1 className="text-5xl sm:text-7xl font-caveat font-bold text-neutral-100">Past Forward</h1>
                <p className="font-permanent-marker text-cyan-400/80 mt-2 text-base sm:text-xl tracking-wide">Generate yourself through the decades.</p>
            </div>
            <div className="w-full max-w-sm p-6 sm:p-8 bg-black/30 backdrop-blur-lg rounded-lg border border-cyan-500/20 shadow-xl overflow-hidden">
                <AnimatePresence mode="wait">
                    <AuthForm
                        isLogin={isLogin}
                        onSubmit={handleSubmit}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        isLoading={isEmailLoading}
                        error={error}
                    />
                </AnimatePresence>
                 <p className="text-center text-neutral-400 mt-6 text-sm">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="font-bold text-cyan-400 hover:text-cyan-300 ml-2 focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                        disabled={isEmailLoading}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </motion.div>
    );
};

export default AuthPage;