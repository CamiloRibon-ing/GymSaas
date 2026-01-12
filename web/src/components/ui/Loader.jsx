import React from 'react';
import '../../styles/dashboard.css';

export default function Loader({ skeleton = false, rows = 5 }) {
  if (skeleton) {
    return (
      <div className="skeleton-loader">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row" />
        ))}
      </div>
    );
  }
  return (
    <div className="loader-container">
      <div className="loader" />
      <span>Cargando...</span>
    </div>
  );
}
