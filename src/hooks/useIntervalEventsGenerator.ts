import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PatientSystems } from '@/types/patient';

export const useIntervalEventsGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateIntervalEvents = useCallback(async (
    systems: PatientSystems,
    existingIntervalEvents?: string,
    patientName?: string
  ): Promise<string | null> => {
    // Check if there's any content in systems
    const hasContent = Object.values(systems).some(
      (val) => val && val.replace(/<[^>]*>/g, '').trim()
    );

    if (!hasContent) {
      toast.error('No system data to summarize. Add content to system reviews first.');
      return null;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-interval-events', {
        body: { systems, existingIntervalEvents, patientName },
      });

      if (error) {
        console.error('Generate interval events error:', error);
        toast.error(error.message || 'Failed to generate interval events');
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      toast.success('Interval events generated');
      return data.intervalEvents;
    } catch (err) {
      console.error('Generate interval events error:', err);
      toast.error('Failed to generate interval events');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateIntervalEvents,
    isGenerating,
  };
};
