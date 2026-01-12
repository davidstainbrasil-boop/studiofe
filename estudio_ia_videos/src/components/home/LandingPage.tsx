'use client';

import Link from 'next/link';
import {
    ArrowRight,
    Video,
    Type,
    Download,
    CheckCircle2,
    Users,
    ShieldCheck,
    GraduationCap,
    Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">

            {/* 1. HERO SECTION */}
            <section className="relative px-6 py-24 md:py-32 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200/40 via-transparent to-transparent dark:from-violet-900/20 pointer-events-none" />

                <div className="max-w-4xl mx-auto relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700 dark:border-violet-900 dark:bg-violet-900/30 dark:text-violet-300">
                        <span className="flex h-2 w-2 rounded-full bg-violet-600 mr-2 animate-pulse"></span>
                        VideoStudio 2.0 is live
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                        Create professional <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                            training videos with AI
                        </span>
                        <br /> — in minutes.
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        The easiest way for training teams, HR, and course creators to turn scripts into engaging video content without any editing skills.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/create">
                            <Button size="lg" className="h-14 px-8 text-lg bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200/50 dark:shadow-none transition-all hover:scale-105">
                                Create Your First Video
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="#how-it-works">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                See how it works
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> No editing required
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Enterprise secure
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Free to start
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. PRODUCT PREVIEW (Moocked) */}
            <section className="px-6 pb-24">
                <div className="max-w-6xl mx-auto rounded-2xl border-8 border-slate-900/5 dark:border-slate-800/50 shadow-2xl bg-slate-900 aspect-video relative overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            {/* Abstract UI representation */}
                            <div className="w-[800px] h-[500px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl flex overflow-hidden opacity-90 mx-auto">
                                <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-4">
                                    <div className="h-8 bg-violet-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                                </div>
                                <div className="flex-1 p-8 grid place-content-center bg-slate-50/50">
                                    <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                                        <Play className="fill-white text-white w-8 h-8 ml-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-8 text-center text-white">
                        <p className="font-medium">Simple, clean interface designed for professionals.</p>
                    </div>
                </div>
            </section>

            {/* 2. HOW IT WORKS */}
            <section id="how-it-works" className="px-6 py-24 bg-white dark:bg-slate-900">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                            Simple 3-Step Process
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400">
                                <Type className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">1. Write your script</h3>
                            <p className="text-slate-500">Type your content or paste a document. Our AI can even help you polish it.</p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">2. Choose presenter</h3>
                            <p className="text-slate-500">Select from diverse AI avatars to present your content professionally.</p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                                <Download className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-semibold">3. Export video</h3>
                            <p className="text-slate-500">Get a high-quality MP4 ready for your LMS or internal channels.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHO IT'S FOR */}
            <section className="px-6 py-24 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold">Built for Professionals</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <GraduationCap className="w-10 h-10 text-violet-600" />
                                <h3 className="text-xl font-bold">Training Teams</h3>
                                <p className="text-slate-500">Scale your L&D content production without hiring external agencies or video editors.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <ShieldCheck className="w-10 h-10 text-indigo-600" />
                                <h3 className="text-xl font-bold">HR & Compliance</h3>
                                <p className="text-slate-500">Keep workforce policies up to date with engaging videos that employees actually watch.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg">
                            <CardContent className="p-8 space-y-4">
                                <Video className="w-10 h-10 text-pink-600" />
                                <h3 className="text-xl font-bold">Course Creators</h3>
                                <p className="text-slate-500">Turn your text-based courses into premium video content to increase value.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 5. WHY / SOCIAL PROOF (Combined) */}
            <section className="px-6 py-24 bg-white dark:bg-slate-900 text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-3xl font-bold">Why teams switch to VideoStudio</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8">
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">10x</div>
                            <div className="text-sm text-slate-500 font-medium">Faster Production</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">0</div>
                            <div className="text-sm text-slate-500 font-medium">Editing Skills</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">100%</div>
                            <div className="text-sm text-slate-500 font-medium">Consistency</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-4xl font-bold text-violet-600">HD</div>
                            <div className="text-sm text-slate-500 font-medium">Export Quality</div>
                        </div>
                    </div>

                    <p className="text-slate-500 italic border-t border-slate-100 pt-8 dark:border-slate-800">
                        &quot;Used for internal training and instructional content by forward-thinking teams.&quot;
                    </p>
                </div>
            </section>

            {/* 7. FINAL CTA */}
            <section className="px-6 py-32 bg-slate-900 text-white text-center">
                <div className="max-w-2xl mx-auto space-y-8">
                    <h2 className="text-4xl font-bold">Ready to create?</h2>
                    <p className="text-slate-300 text-xl">Create your first training video today. No credit card required for trial.</p>
                    <Link href="/create">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-200">
                            Create Your First Video
                        </Button>
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="px-6 py-12 bg-slate-950 text-slate-500 text-sm text-center border-t border-slate-900">
                <p>© 2026 VideoStudio AI. All rights reserved.</p>
            </footer>
        </div>
    );
}
