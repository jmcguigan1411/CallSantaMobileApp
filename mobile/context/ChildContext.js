import React, { createContext, useState } from 'react';

export const ChildContext = createContext();

export const ChildProvider = ({ children }) => {
  const [selectedChild, setSelectedChild] = useState(null);

  return (
    <ChildContext.Provider value={{ selectedChild, setSelectedChild }}>
      {children}
    </ChildContext.Provider>
  );
};
