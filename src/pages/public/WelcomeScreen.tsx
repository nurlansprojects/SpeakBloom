import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import { BloomBadge } from '../../components/common/BloomBadge';
import { BLOOM_LEVELS, BloomLevelNumber } from '../../types';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Could not complete Google sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const levels: BloomLevelNumber[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F4FF] dark:bg-[#0f0a1c] text-[#1C1530] dark:text-[#f3f0fc]">
      {/* Desktop Violet Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-[#6D28D9] text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-[18px]">
            <Logo size={42} />
          </div>
          <span className="text-2xl font-bold tracking-tight">SpeakBloom</span>
        </div>

        <div className="max-w-md my-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Master spoken English through Bloom's Taxonomy.
            </h1>
            <p className="text-base text-purple-100 font-normal">
              Progress naturally from memory to creative self-expression across six structured learning stages.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {levels.map((lvl) => {
              const info = BLOOM_LEVELS[lvl];
              return (
                <div
                  key={lvl}
                  className="flex items-center gap-3.5 p-3 rounded-[14px] bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <div className="w-8 h-8 rounded-full bg-white text-[#6D28D9] font-bold text-sm flex items-center justify-center shrink-0">
                    {lvl}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{info.name}</h2>
                    <p className="text-xs text-purple-200">{info.tagline}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-purple-200">
          <ShieldCheck size={16} strokeWidth={1.8} />
          <span>Production-grade Google Authentication and Cloud Firestore security</span>
        </div>
      </div>

      {/* Main Login Frame (Matches Mobile PDF Screen 1 perfectly) */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Logo size={84} />
          </div>

          {/* Heading and Tagline */}
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
              SpeakBloom
            </h1>
            <p className="text-base text-[#5B5470] dark:text-[#a49cb5] leading-relaxed max-w-xs mx-auto">
              Speak English with confidence, one thinking level at a time.
            </p>
          </div>

          {/* Error notice if sign-in fails */}
          {error && (
            <div className="w-full p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 rounded-[14px] border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {/* Sign In CTA */}
          <div className="w-full space-y-4 pt-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full min-h-[52px] px-6 py-3.5 bg-white dark:bg-[#18122b] text-[#1C1530] dark:text-white font-semibold text-base rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm hover:shadow-md hover:border-[#8B5CF6] transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] leading-normal px-4">
              By continuing you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
