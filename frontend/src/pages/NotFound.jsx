import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-extrabold text-slate-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The requested resource does not exist or you may lack authorization to access it.
      </p>
      <Link to="/dashboard">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
};
