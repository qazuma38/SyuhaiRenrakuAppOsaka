/*
  # Send Web Push Notification Function (FCM V1 API)

  1. Purpose
    - Sends push notifications to web browsers using FCM V1 API
    - Handles both mobile and web FCM tokens
    - Logs notification history for tracking

  2. Functionality
    - Uses Firebase Admin SDK with V1 API
    - Validates FCM tokens
    - Records notification delivery status
    - Handles error cases gracefully

  3. Security
    - Uses Service Account credentials
    - Validates request data
    - Implements proper error handling
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface NotificationRequest {
  receiverId: string;
  title: string;
  body: string;
  data?: any;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    webpush?: {
      headers: {
        TTL: string;
      };
      notification: {
        icon: string;
        badge: string;
        require_interaction: boolean;
      };
    };
  };
}

// Base64URL encode function
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM headers and footers, and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode base64
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Firebase Admin SDK用のアクセストークン取得
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Create the signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  try {
    // Clean and prepare the private key
    let privateKeyPem = serviceAccount.private_key;
    
    // Handle escaped newlines in the private key
    if (typeof privateKeyPem === 'string') {
      privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
    }
    
    // Ensure proper PEM format
    if (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format: missing PEM headers');
    }
    
    // Convert PEM to ArrayBuffer
    const keyData = pemToArrayBuffer(privateKeyPem);
    
    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signingInput)
    );

    // Encode the signature
    const encodedSignature = base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    );

    // Create the complete JWT
    const jwt = `${signingInput}.${encodedSignature}`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.access_token;
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
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

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const firebaseServiceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');

    if (!firebaseProjectId || !firebaseServiceAccountKey) {
      return new Response(
        JSON.stringify({ error: 'Firebase configuration not found' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Parse service account key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(firebaseServiceAccountKey);
    } catch (parseError) {
      console.error('Failed to parse Firebase service account key:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase service account key format' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields in service account
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return new Response(
        JSON.stringify({ error: 'Invalid service account: missing client_email or private_key' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Prepare FCM V1 message
    const message: FCMMessage = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ) : undefined,
        webpush: {
          headers: {
            TTL: '86400', // 24 hours
          },
          notification: {
            icon: '/assets/images/icon.png',
            badge: '/assets/images/icon.png',
            require_interaction: false,
          },
        },
      },
    };

    // Send notification via FCM V1 API
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const fcmResult = await fcmResponse.json();
    
    // Determine delivery status
    let deliveryStatus = 'failed';
    if (fcmResponse.ok && fcmResult.name) {
      deliveryStatus = 'sent';
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
      console.error('Failed to log notification history');
    }

    return new Response(
      JSON.stringify({
        success: deliveryStatus === 'sent',
        deliveryStatus: deliveryStatus,
        fcmResult: fcmResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending web notification:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});