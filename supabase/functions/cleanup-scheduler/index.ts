/*
  # Cleanup Scheduler Edge Function

  1. Purpose
    - Schedules the cleanup-old-data function to run weekly on Sundays at 2 AM
    - Provides manual trigger capability
    - Logs scheduling activities

  2. Functionality
    - Checks if it's Sunday at 2 AM (JST)
    - Calls the cleanup-old-data function
    - Returns scheduling status

  3. Usage
    - Can be called via cron job or manual trigger
    - Designed to be called frequently (e.g., every hour) to check schedule
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const forceRun = url.searchParams.get('force') === 'true';
    
    // Get current time in JST (UTC+9)
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstTime = new Date(now.getTime() + (jstOffset * 60 * 1000));
    
    const dayOfWeek = jstTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = jstTime.getHours();
    const minute = jstTime.getMinutes();
    
    console.log(`Current JST time: ${jstTime.toISOString()}`);
    console.log(`Day of week: ${dayOfWeek} (0=Sunday), Hour: ${hour}, Minute: ${minute}`);
    
    // Check if it's Sunday (0) at 2 AM (hour 2) within the first 5 minutes
    const shouldRun = forceRun || (dayOfWeek === 0 && hour === 2 && minute < 5);
    
    if (!shouldRun) {
      return new Response(
        JSON.stringify({
          scheduled: false,
          message: forceRun ? 'Force run not requested' : 'Not scheduled time (Sunday 2:00-2:05 AM JST)',
          currentTime: jstTime.toISOString(),
          nextScheduled: getNextScheduledTime(jstTime),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Triggering cleanup function...');
    
    // Get the base URL for the current request
    const baseUrl = `${url.protocol}//${url.host}`;
    const cleanupUrl = `${baseUrl}/functions/v1/cleanup-old-data`;
    
    // Call the cleanup function
    const cleanupResponse = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });
    
    const cleanupResult = await cleanupResponse.json();
    
    console.log('Cleanup function result:', cleanupResult);
    
    return new Response(
      JSON.stringify({
        scheduled: true,
        triggered: cleanupResponse.ok,
        message: forceRun ? 'Cleanup manually triggered' : 'Cleanup automatically triggered',
        currentTime: jstTime.toISOString(),
        cleanupResult,
      }),
      {
        status: cleanupResponse.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in cleanup scheduler:', error);
    
    return new Response(
      JSON.stringify({ 
        scheduled: false,
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to calculate next scheduled time
function getNextScheduledTime(currentTime: Date): string {
  const next = new Date(currentTime);
  
  // Find next Sunday
  const daysUntilSunday = (7 - next.getDay()) % 7;
  if (daysUntilSunday === 0 && (next.getHours() > 2 || (next.getHours() === 2 && next.getMinutes() >= 5))) {
    // If it's Sunday but past 2:05 AM, schedule for next Sunday
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + daysUntilSunday);
  }
  
  // Set to 2:00 AM
  next.setHours(2, 0, 0, 0);
  
  return next.toISOString();
}