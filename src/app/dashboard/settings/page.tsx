"use client";

import { Settings, Bell, Lock, Key, Globe } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="p-6 pb-20 max-w-[1000px] mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mb-1">
                    <Settings className="w-6 h-6 text-neutral-400" />
                    Account Settings
                </h1>
                <p className="text-neutral-400 text-sm">Manage your trading preferences and account security</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation / Categories */}
                <div className="col-span-1 space-y-1">
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#111] text-white rounded-lg cursor-pointer">
                        <Lock className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium">Security</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-[#0a0a0a] hover:text-white rounded-lg transition-colors cursor-pointer">
                        <Bell className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium">Notifications</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-[#0a0a0a] hover:text-white rounded-lg transition-colors cursor-pointer">
                        <Globe className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium">Preferences</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:bg-[#0a0a0a] hover:text-white rounded-lg transition-colors cursor-pointer">
                        <Key className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium">API Keys</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    {/* Security Section */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-[#1a1a1a]">
                            <h2 className="text-lg font-semibold text-white mb-1">Password & Authentication</h2>
                            <p className="text-sm text-neutral-500">Update your security credentials</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Current Password</label>
                                <input type="password" placeholder="••••••••" className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">New Password</label>
                                <input type="password" placeholder="••••••••" className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors" />
                            </div>
                            <div className="pt-2">
                                <button className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2FA Section */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-1">Two-Factor Authentication</h2>
                                <p className="text-sm text-neutral-500">Add an extra layer of security to your account</p>
                            </div>
                            <button className="px-4 py-2 bg-[#111] border border-[#222] text-white hover:bg-[#1a1a1a] transition-colors rounded-lg font-medium text-sm">
                                Enable 2FA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
