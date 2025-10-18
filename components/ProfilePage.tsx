/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import firebase from 'firebase/compat/app';

interface ProfilePageProps {
  user: firebase.User;
  initialProfile: { displayName: string; avatar?: string };
  onSave: (profileData: { displayName: string; avatar?: string }) => void;
  onClose: () => void;
  onSignOut: () => void;
}

const primaryButtonClasses = "font-permanent-marker text-base sm:text-lg text-center text-cyan-300 bg-cyan-900/20 border-2 border-cyan-400 py-2 px-5 sm:px-6 rounded-sm transform transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_theme(colors.cyan.400)] disabled:opacity-50";
const secondaryButtonClasses = "font-permanent-marker text-base sm:text-lg text-center text-cyan-400 bg-transparent border-2 border-cyan-400/50 py-2 px-5 sm:px-6 rounded-sm transform transition-all duration-300 hover:scale-105 hover:rotate-2 hover:bg-cyan-400/10 hover:border-cyan-400";


const ProfilePage: React.FC<ProfilePageProps> = ({ user, initialProfile, onSave, onClose, onSignOut }) => {
    const [displayName, setDisplayName] = useState('');
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        setDisplayName(initialProfile.displayName || '');
        setAvatar(initialProfile.avatar);
    }, [initialProfile]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 256;
                    const MAX_HEIGHT = 256;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL(file.type);
                    setAvatar(dataUrl);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (displayName.trim()) {
            onSave({ displayName: displayName.trim(), avatar });
        }
    };

    return (
        <AnimatePresence>
            {/* @ts-ignore */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
                aria-modal="true"
                role="dialog"
                onClick={onClose}
            >
                {/* @ts-ignore */}
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="w-full max-w-md mx-auto flex flex-col items-center gap-6 bg-black/30 backdrop-blur-lg rounded-lg border border-cyan-500/20 shadow-xl p-6 sm:p-8"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <h2 className="font-permanent-marker text-2xl sm:text-3xl text-center text-neutral-200">
                        Your Profile
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8 mt-4">
                        <div className="flex flex-col items-center">
                            <button type="button" onClick={handleAvatarClick} className="relative group rounded-full" aria-label="Change profile picture">
                                {avatar ? (
                                    <img src={avatar} alt="Profile Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-neutral-600 group-hover:border-cyan-400 transition-colors" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-white text-sm font-permanent-marker">Change</span>
                                </div>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                id="displayName"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="block w-full px-0 py-2.5 text-base sm:text-lg text-white bg-transparent border-0 border-b-2 border-neutral-600 appearance-none focus:outline-none focus:ring-0 focus:border-cyan-400 transition-colors duration-300 peer"
                                placeholder=" " // Required for the label animation
                            />
                            <label htmlFor="displayName" className="absolute text-base sm:text-lg text-neutral-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-cyan-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
                                Display Name
                            </label>
                        </div>

                         <div className="text-center -mt-4">
                            <p className="text-neutral-400 text-sm">Email Address</p>
                            <p className="text-neutral-100 text-base sm:text-lg break-all">{user.email || 'N/A'}</p>
                        </div>
                        
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button type="button" onClick={onClose} className={secondaryButtonClasses}>
                                Cancel
                            </button>
                            <button type="submit" className={primaryButtonClasses} disabled={!displayName.trim()}>
                                Save
                            </button>
                        </div>
                    </form>
                    <div className="w-full border-t border-cyan-500/10 mt-6 pt-4">
                        <button
                            type="button"
                            onClick={onSignOut}
                            className="w-full text-center font-permanent-marker text-sm text-red-400/80 hover:text-red-400 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProfilePage;