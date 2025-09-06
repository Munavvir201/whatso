
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TrainingContextType {
  clientData: string;
  setClientData: (data: string) => void;
  trainingInstructions: string;
  setTrainingInstructions: (instructions: string) => void;
  chatFlow: string;
  setChatFlow: (flow: string) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [clientData, setClientData] = useState("");
  const [trainingInstructions, setTrainingInstructions] = useState("");
  const [chatFlow, setChatFlow] = useState("");

  return (
    <TrainingContext.Provider value={{ 
      clientData, 
      setClientData,
      trainingInstructions,
      setTrainingInstructions,
      chatFlow,
      setChatFlow
    }}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTrainingContext = () => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTrainingContext must be used within a TrainingProvider');
  }
  return context;
};
