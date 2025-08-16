/*
  # Send Push Notification Function

  1. Purpose
    - Sends push notifications when chat messages are sent
    - Handles FCM token validation and notification delivery
    - Logs notification history for tracking

  2. Functionality
    - Validates FCM tokens
    - Sends notifications via Expo Push API
    - Records notification delivery status
    - Handles error cases gracefully

  3. Security
    - Validates request data
    - Uses environment variables for sensitive data
    - Implements proper error handling
*/

import { corsHeaders } from '../_shared/cors.ts';

interface NotificationRequest {
  receiverId: string;
  title: string;
  body: string;
  data?: any;
}

interface ExpoMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: any;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { receiverId, title, body, data }: NotificationRequest = await req.json();

    if (!receiverId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: receiverId, title, body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseHeaders = {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
    };

    // Get user's FCM token
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${receiverId}&select=fcm_token`, {
      headers: supabaseHeaders,
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user data:', await userResponse.text());
      throw new Error('Failed to fetch user data');
    }

    const users = await userResponse.json();
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const fcmToken = users[0].fcm_token;
    if (!fcmToken) {
      return new Response(
        JSON.stringify({ error: 'User has no FCM token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare Expo push notification
    const message: ExpoMessage = {
      to: fcmToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };

    // Send notification via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    let expoResult;
    let deliveryStatus = 'failed';

    if (expoResponse.ok) {
      expoResult = await expoResponse.json();
      
      // Check if the response indicates success
      if (expoResult.data && expoResult.data.status === 'ok') {
        deliveryStatus = 'sent';
      } else if (expoResult.data && expoResult.data.details) {
        console.error('Expo push error details:', expoResult.data.details);
      }
    } else {
      const errorText = await expoResponse.text();
      console.error('Expo push API error:', errorText);
      expoResult = { error: errorText };
    }

    // Log notification history
    const historyData = {
      user_id: receiverId,
      title: title,
      body: body,
      data: data || null,
      delivery_status: deliveryStatus,
    };

    const historyResponse = await fetch(`${supabaseUrl}/rest/v1/notification_history`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(historyData),
    });

    if (!historyResponse.ok) {
      console.error('Failed to log notification history:', await historyResponse.text());
    }

    return new Response(
      JSON.stringify({
        success: deliveryStatus === 'sent',
        deliveryStatus: deliveryStatus,
        expoResult: expoResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    
    return new Response(
      JSON.stringify({ 
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