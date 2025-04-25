// src/app/api/click/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST() { // Removed the 'req: Request' parameter
    const cookiestore = cookies();
    const supabase = createClient(cookiestore);
  try {
    // Zähler erhöhen
    const { data, error } = await supabase.rpc('increment_counter', {
      counter_id: 1,
      increment_val: 1,
    });

    if (error) {
      return NextResponse.error();
    }

    return NextResponse.json({ newValue: data });
  } catch (error) {
    console.error("Error incrementing counter:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}