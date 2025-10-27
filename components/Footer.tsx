/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REMIX_IDEAS = [
    "to animate your favorite decade.",
    "to turn your pet into a cartoon character.",
    "to create a fantasy version of yourself.",
    "to design a superhero based on your photo.",
    "to hear a radio broadcast from the past.",
    "to place yourself in famous historical events.",
    "to generate a custom video game avatar.",
    "to save your time travels to the cloud."
];

const Footer = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % REMIX_IDEAS.length);
        }, 3500); // Change text every 3.5 seconds

        return () => clearInterval(intervalId);
    }, []);

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-[#050a19]/70 backdrop-blur-lg p-3 z-50 text-neutral-200 text-xs sm:text-sm border-t border-cyan-500/10">
            <div className="max-w-screen-xl mx-auto flex flex-wrap justify-center items-center gap-x-6 gap-y-2 px-4">
                {/* "Powered by" section */}
                <div className="hidden md:flex items-center gap-4 text-neutral-400 whitespace-nowrap">
                    <p>Powered by jiam.ai</p>
                    <span className="text-neutral-600" aria-hidden="true">|</span>
                    <p>
                        Created by{' '}
                        <a
                            href="https://youtube.com/@jiam-ai1?si=bn-nUFaCQhmKOm3r"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-300 hover:text-cyan-400 transition-colors duration-200"
                        >
                            @Project Kidd
                        </a>
                    </p>
                </div>

                {/* "Remix this app" section */}
                <div className="hidden lg:flex items-center gap-2 text-neutral-300 min-w-0">
                    <span className="flex-shrink-0">Remix this app...</span>
                    <div className="relative w-64 h-5">
                        <AnimatePresence mode="wait">
                            {/* @ts-ignore */}
                            <motion.span
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0 font-medium text-neutral-100 whitespace-nowrap text-left"
                            >
                                {REMIX_IDEAS[index]}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Buttons section */}
                <div className="flex flex-row flex-wrap justify-center items-center gap-3 sm:gap-6">
                    <a
                        href="https://jiam.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-permanent-marker text-sm sm:text-base text-center text-cyan-300 bg-cyan-900/20 border-2 border-cyan-400 py-2 px-4 rounded-sm transform transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_15px_theme(colors.cyan.400)] whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">app by Jiam Tech</span>
                        <span className="sm:hidden">Jiam Tech</span>
                    </a>
                    <a
                        href="https://wa.me/+23277931814"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-permanent-marker text-sm sm:text-base text-center text-cyan-400 bg-transparent border border-cyan-400/50 py-2 px-4 rounded-sm transform transition-all duration-300 hover:scale-105 hover:rotate-2 hover:bg-cyan-400/10 hover:border-cyan-400 whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">Chat with the developer</span>
                        <span className="sm:hidden">Contact Dev</span>
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
