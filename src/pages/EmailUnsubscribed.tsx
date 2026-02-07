import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoDark from '@/assets/navbar-logo-dark.png';

type Status = 'success' | 'error';
type ErrorReason = 'invalid-link' | 'invalid-token' | 'server-error';

const EmailUnsubscribed = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') as Status | null;
  const reason = searchParams.get('reason') as ErrorReason | null;

  const getContent = () => {
    if (status === 'success') {
      return {
        icon: <CheckCircle className="w-20 h-20 text-green-500" />,
        title: 'Unsubscribed Successfully',
        message: 'You have been successfully unsubscribed from Scamly updates. You will no longer receive any emails from us.',
      };
    }

    if (status === 'error') {
      switch (reason) {
        case 'invalid-link':
          return {
            icon: <XCircle className="w-20 h-20 text-destructive" />,
            title: 'Invalid Request',
            message: 'The unsubscribe link is invalid or incomplete. Please try clicking the link from your email again.',
          };
        case 'invalid-token':
          return {
            icon: <XCircle className="w-20 h-20 text-destructive" />,
            title: 'Invalid Token',
            message: 'The unsubscribe link is invalid or has expired. Please contact support if you need assistance.',
          };
        case 'server-error':
        default:
          return {
            icon: <AlertTriangle className="w-20 h-20 text-yellow-500" />,
            title: 'Something Went Wrong',
            message: 'An unexpected error occurred. Please try again later or contact support.',
          };
      }
    }

    // Default fallback for missing/invalid status
    return {
      icon: <AlertTriangle className="w-20 h-20 text-yellow-500" />,
      title: 'Invalid Page',
      message: 'This page was accessed incorrectly. Please use the unsubscribe link from your email.',
    };
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src={logoDark} 
            alt="Scamly" 
            className="h-10 mx-auto"
          />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          {content.icon}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-semibold text-white mb-4">
          {content.title}
        </h1>

        {/* Message */}
        <p className="text-white/80 mb-8 leading-relaxed">
          {content.message}
        </p>

        {/* Back to Home Button */}
        <Link to="/">
          <Button 
            variant="outline" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            Back to Home
          </Button>
        </Link>

        {/* Footer */}
        <p className="mt-12 text-sm text-white/40">
          © Scamly
        </p>
      </div>
    </div>
  );
};

export default EmailUnsubscribed;
