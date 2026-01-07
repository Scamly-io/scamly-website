import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ReferralDashboard, ReferralCodeInput } from '@/components/referral';
import logoLight from '@/assets/navbar-logo-light.png';
import logoDark from '@/assets/navbar-logo-dark.png';
import {
  User, 
  CreditCard, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  Mail,
  Lock,
  Calendar,
  MapPin,
  Crown,
  Check,
  ExternalLink,
  Loader2,
  ArrowUpRight,
  Gift
} from 'lucide-react';
import { z } from 'zod';
import { countries } from '@/constants/countries';

const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

type Tab = 'profile' | 'subscription' | 'referrals' | 'security';

export default function Portal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, loading, signOut, updateProfile, updateEmail, updatePassword, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  
  // Profile form
  const [firstName, setFirstName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  
  // Security form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Referral code for checkout
  const [checkoutReferralCode, setCheckoutReferralCode] = useState<string | null>(null);

  // Handle checkout success/cancel params and referral code from URL
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const refCode = searchParams.get('ref');
    
    // Pre-fill referral code if passed from auth page
    if (refCode && !checkoutReferralCode) {
      setCheckoutReferralCode(refCode);
      // Go to subscription tab to show the referral code input
      setActiveTab('subscription');
    }
    
    if (success === 'true') {
      toast({
        title: 'Subscription activated!',
        description: 'Welcome to Scamly Premium. Your subscription is now active.',
      });
      // Refresh profile to get updated subscription status
      refreshProfile();
      // Clear the query params
      setSearchParams({});
      setActiveTab('subscription');
    } else if (canceled === 'true') {
      toast({
        title: 'Checkout canceled',
        description: 'You can subscribe anytime from your portal.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refreshProfile]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setDob(profile.dob || '');
      setCountry(profile.country || '');
      setGender(profile.gender || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      first_name: firstName,
      dob,
      country,
      gender,
    });
    setSaving(false);
    
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    }
  };

  const handleUpdateEmail = async () => {
    try {
      z.string().email('Please enter a valid email address').parse(newEmail);
    } catch {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    setSaving(true);
    const { error } = await updateEmail(newEmail);
    setSaving(false);
    
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verification sent',
        description: 'Check your new email address for a verification link.',
      });
      setNewEmail('');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }
    
    setSaving(true);
    const { error } = await updatePassword(newPassword);
    setSaving(false);
    
    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully changed.',
      });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Stripe checkout functions
  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setSaving(true);
    toast({
      title: 'Redirecting to checkout...',
      description: `You'll be redirected to complete your ${plan} subscription.`,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, referralCode: checkoutReferralCode },
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setSaving(true);
    toast({
      title: 'Opening billing portal...',
      description: 'You can manage your subscription there.',
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Portal failed',
        description: error instanceof Error ? error.message : 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isPremium = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  const isTrialing = profile?.subscription_status === 'trialing';
  const subscriptionEndDate = profile?.subscription_current_period_end 
    ? new Date(profile.subscription_current_period_end).toLocaleDateString()
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'subscription' as Tab, label: 'Subscription', icon: CreditCard },
    { id: 'referrals' as Tab, label: 'Referrals', icon: Gift },
    { id: 'security' as Tab, label: 'Security', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <img 
                src={theme === 'dark' ? logoDark : logoLight} 
                alt="Scamly" 
                className="h-9 w-auto"
              />
            </Link>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              Welcome back, {profile?.first_name || 'there'}!
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and subscription.
            </p>
          </div>
          
          {/* Subscription Status Banner */}
          {!isPremium && (
            <div className="mb-8 p-6 rounded-2xl gradient-bg relative overflow-hidden">
              <div className="absolute inset-0 bg-hero-pattern opacity-10" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-primary-foreground text-lg">
                      Upgrade to Premium
                    </h3>
                    <p className="text-primary-foreground/80 text-sm">
                      Get unlimited scans, AI chat, and more.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('subscription')}
                >
                  View Plans
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">Profile Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your personal details here.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60"
                    />
                    <p className="text-xs text-muted-foreground">
                      Change email in Security settings
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select your country</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select your gender</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="gradient" onClick={handleUpdateProfile} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
            
            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">Subscription</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your Scamly subscription and billing.
                  </p>
                </div>
                
                {/* Current Plan */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    {isPremium ? (
                      <span className="px-2 py-0.5 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                        {isTrialing ? 'Free Trial' : 'Premium'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="font-display font-bold text-lg">
                    {isPremium 
                      ? isTrialing 
                        ? 'Free for 14 days'
                        : profile?.subscription_plan === 'premium-yearly' ? '$99/year' : '$10/month'
                      : '$0/month'
                    }
                  </p>
                  {isPremium && subscriptionEndDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {isTrialing
                        ? `Trial ends on ${subscriptionEndDate}`
                        : profile?.subscription_status === 'cancelled' 
                          ? `Access until ${subscriptionEndDate}`
                          : `Renews on ${subscriptionEndDate}`
                      }
                    </p>
                  )}
                </div>
                
                {/* Referral Code Input for non-premium users */}
                {!isPremium && (
                  <div className="mb-6">
                    <ReferralCodeInput
                      initialValue={checkoutReferralCode || ''}
                      onValidCode={(code) => setCheckoutReferralCode(code)}
                      onClear={() => setCheckoutReferralCode(null)}
                    />
                  </div>
                )}
                
                {/* Plan Options */}
                {!isPremium && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-xl border border-border hover:border-primary transition-colors">
                      <h3 className="font-display font-bold text-lg mb-2">Monthly</h3>
                      <p className="text-3xl font-bold mb-1">$10<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                      <p className="text-sm text-muted-foreground mb-4">Billed monthly</p>
                      {checkoutReferralCode && (
                        <p className="text-sm text-green-600 mb-2">-10% referral discount applied!</p>
                      )}
                      <ul className="space-y-2 mb-6">
                        {['Unlimited scans', 'AI Chat', 'Contact Search', 'Full Library'].map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" className="w-full" onClick={() => handleUpgrade('monthly')}>
                        Choose Monthly
                      </Button>
                    </div>
                    
                    <div className="p-6 rounded-xl border-2 border-primary relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full gradient-bg text-xs font-semibold text-primary-foreground">
                          Save $21
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg mb-2">Yearly</h3>
                      <p className="text-3xl font-bold mb-1">$99<span className="text-lg font-normal text-muted-foreground">/yr</span></p>
                      <p className="text-sm text-muted-foreground mb-4">Billed annually</p>
                      {checkoutReferralCode && (
                        <p className="text-sm text-green-600 mb-2">-10% referral discount applied!</p>
                      )}
                      <ul className="space-y-2 mb-6">
                        {['Unlimited scans', 'AI Chat', 'Contact Search', 'Full Library'].map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button variant="gradient" className="w-full" onClick={() => handleUpgrade('yearly')}>
                        Choose Yearly
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Manage Subscription */}
                {isPremium && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={handleManageSubscription}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manage Billing
                    </Button>
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleManageSubscription}>
                      Cancel Subscription
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">Referral Program</h2>
                  <p className="text-sm text-muted-foreground">
                    Share your code and earn discounts on your subscription.
                  </p>
                </div>
                <ReferralDashboard />
              </div>
            )}
            
            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-xl font-bold mb-1">Security Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your email address and password.
                  </p>
                </div>
                
                {/* Change Email */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Change Email</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="newEmail"
                          type="email"
                          placeholder="new@example.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="sm:self-end">
                      <Button onClick={handleUpdateEmail} disabled={saving || !newEmail}>
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Update Email
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Change Password */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-semibold">Change Password</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Min 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleUpdatePassword} disabled={saving || !newPassword || !confirmPassword}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
