import React from 'react';

const SkeletonLoader = ({ className = '', lines = 1, width = 'full' }) => {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/4': 'w-1/4'
  };

  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`skeleton h-4 rounded mb-2 ${widthClasses[width] || widthClasses.full}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className} animate-fade-in`}>
      <SkeletonLoader lines={1} width="1/3" className="mb-4" />
      <SkeletonLoader lines={3} width="full" />
      <div className="mt-4 flex gap-2">
        <SkeletonLoader lines={1} width="1/4" />
        <SkeletonLoader lines={1} width="1/4" />
      </div>
    </div>
  );
};

export const SkeletonStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
          <SkeletonLoader lines={1} width="1/2" className="mb-3" />
          <SkeletonLoader lines={1} width="3/4" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;

