"use client"
import { useState, useEffect, useRef } from 'react'; // Import useRef
import { createClient } from "@/utils/supabase/client";
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';

export default function Clicker() {


    const supabase = createClient();

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const COOLDOWN_SECONDS = 5;
  const [milestones, setMilestones] = useState<{ id: number, goal: number, reached: boolean }[]>([]);
  const [nextGoal, setNextGoal] = useState<number | null>(null);

  const [milestoneReached, setMilestoneReached] = useState(false);
  const isProcessingClick = useRef(false); // Ref to track if handleClick is running

 // Lade Initialdaten
 useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: counterData } = await supabase
        .from('counters')
        .select('value')
        .eq('id', 1)
        .single();

      const { data: milestoneData } = await supabase
        .from('milestones')
        .select('*')
        .order('goal', { ascending: true });

      if (counterData) setCount(counterData.value);
      if (milestoneData) {
        setMilestones(milestoneData);
        const next = milestoneData.find(m => !m.reached);
        if (next) setNextGoal(next.goal);
      }

      setLoading(false);
    };

    fetchData();
  }, []);


  const handleClick = async () => {
    if (isCoolingDown || isProcessingClick.current) return;

    isProcessingClick.current = true;
    setIsCoolingDown(true);
    setCooldownTimeLeft(COOLDOWN_SECONDS);

    try {
      const response = await fetch('/api/click', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to increment counter');
      }

      const newCountAfterClick = count + 1; // Predict the count after the click

      // Check if a milestone was reached
      const nextUnreachedMilestone = milestones.find(m => !m.reached && newCountAfterClick >= m.goal);
      if (nextUnreachedMilestone) {
        setMilestoneReached(true);
        await supabase
          .from('milestones')
          .update({ reached: true })
          .eq('id', nextUnreachedMilestone.id);
        setTimeout(() => setMilestoneReached(false), 5000);

        // Update local milestones immediately
        setMilestones(prevMilestones =>
          prevMilestones.map(m =>
            m.id === nextUnreachedMilestone.id ? { ...m, reached: true } : m
          )
        );
        const remaining = milestones.find(m => !m.reached && newCountAfterClick < m.goal);
        if (remaining) setNextGoal(remaining.goal);
        else setNextGoal(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      isProcessingClick.current = false;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('public:counters')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'counters', filter: 'id=eq.1' },
        async (payload) => {
          const newCount = payload.new.value;

          // Only update state if the change wasn't initiated by this client's click
          if (!isProcessingClick.current) {
            setCount(newCount);

            const { data: updatedMilestones } = await supabase
              .from('milestones')
              .select('*')
              .order('goal', { ascending: true });

            if (updatedMilestones) {
              setMilestones(updatedMilestones);
              const next = updatedMilestones.find(m => !m.reached);
              if (next) setNextGoal(next.goal);
              else setNextGoal(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]); // Removed milestones and count from dependency array

  // Cooldown-Countdown verwalten
  useEffect(() => {
    if (isCoolingDown && cooldownTimeLeft > 0) {
      const timer = setInterval(() => {
        setCooldownTimeLeft((prev) => {
          if (prev <= 1) {
            setIsCoolingDown(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isCoolingDown, cooldownTimeLeft]);


  const { width, height } = useWindowSize()

  return (

    <div className="flex flex-col items-center justify-center gap-10">
      {milestoneReached ? (
        <div className=" text-white p-4 rounded">
          🎉 Ziel erreicht! {nextGoal} ist das nächste ziel.
          <Confetti width={width} height={height} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-10">
            <Progress value={count} max={nextGoal || 100} className="w-96" />
        <div className="text-white p-4 rounded">
          {nextGoal && (
            <p>Das nächste Ziel ist: <strong>{nextGoal}</strong></p>
          )}
        </div>
        </div>
      )}
      {loading ? (
        <p>Lade Daten...</p>
      ) : (
        <h1 className="font-black text-9xl text-center">{count}</h1>
      )}
      {isCoolingDown ? (
        <Progress value={cooldownTimeLeft} max={COOLDOWN_SECONDS} />
      ) : (
        <Button size="lg" onClick={handleClick}>Click me</Button>
      )}
    </div>
  );
}