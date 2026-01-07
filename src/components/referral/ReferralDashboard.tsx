import { useState } from 'react';
import { useReferral } from '@/hooks/useReferral';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Edit2, Gift, Users, RefreshCw, Percent, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ReferralDashboard() {
  const { stats, loading, error, updateCode, fetchStats } = useReferral();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!stats?.referralCode) return;
    
    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    
    const shareUrl = `${window.location.origin}/auth?ref=${stats.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join with my referral',
          text: `Use my referral code ${stats.referralCode} to get 10% off your first subscription!`,
          url: shareUrl,
        });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied!', description: 'Referral link copied to clipboard' });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied!', description: 'Referral link copied to clipboard' });
    }
  };

  const handleUpdateCode = async () => {
    if (!newCode.trim()) return;
    
    setIsUpdating(true);
    const result = await updateCode(newCode.trim());
    setIsUpdating(false);

    if (result.success) {
      toast({ title: 'Code updated!', description: `Your new referral code is ${result.referralCode}` });
      setIsEditing(false);
      setNewCode('');
    } else {
      toast({ title: 'Update failed', description: result.error || 'Could not update referral code', variant: 'destructive' });
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStats} className="mt-2">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Trial users see a different message - they have a code but can't refer yet
  if (stats?.isTrialing) {
    const trialEndDate = stats.trialEnd ? new Date(stats.trialEnd) : null;
    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>
            You'll be able to refer friends once your trial ends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Free Trial Active</span>
            </div>
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
              {daysRemaining !== null 
                ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining in your trial.`
                : 'Your trial is active.'
              } Once your subscription is active, you can start referring friends!
            </p>
          </div>
          
          {stats.referralCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Your referral code (available after trial)</label>
              <code className="block rounded-md bg-muted px-4 py-3 font-mono text-lg tracking-wider opacity-50">
                {stats.referralCode}
              </code>
            </div>
          )}
          
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How it will work:</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>Share your code with a friend</li>
              <li>They get <strong>10% off</strong> their first subscription</li>
              <li>You get <strong>10% off</strong> your next invoice</li>
              <li>One referral per billing period</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats?.referralCodeActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Upgrade to Premium to get your referral code and earn discounts!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Premium members can refer one friend per billing period. 
              Both you and your friend get <strong>10% off</strong>!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const billingPeriod = stats.subscriptionPlan === 'premium-yearly' ? 'year' : 'month';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Referral Program
            </CardTitle>
            <CardDescription>Refer a friend and both get 10% off</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Your Referral Code</label>
          
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Enter new code"
                maxLength={20}
                className="font-mono uppercase"
              />
              <Button onClick={handleUpdateCode} disabled={isUpdating || !newCode.trim()}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setNewCode(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-4 py-3 font-mono text-lg tracking-wider">
                {stats.referralCode}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copy code">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsEditing(true)} title="Edit code">
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button variant="secondary" className="w-full" onClick={handleShare}>
            Share Referral Link
          </Button>
        </div>

        {/* Status Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total Referrals</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.totalReferrals}</p>
          </div>
          
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="h-4 w-4" />
              <span className="text-sm">Converted</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.convertedReferrals}</p>
          </div>
          
          <div className="col-span-2 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span className="text-sm">This {billingPeriod}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {stats.canReferThisPeriod ? (
                <>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">Ready to refer!</p>
                  <Badge variant="secondary">1 available</Badge>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Referral used</p>
                  <Badge variant="outline">{stats.currentRewardApplied ? '10% applied' : '10% pending'}</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How it works:</p>
          <ul className="mt-2 space-y-1 list-disc pl-4">
            <li>Share your code with a friend</li>
            <li>They get <strong>10% off</strong> their first subscription</li>
            <li>You get <strong>10% off</strong> your next invoice</li>
            <li>One referral per billing {billingPeriod}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
