/*
  # Data Cleanup Edge Function

  1. Purpose
    - Deletes records older than 15 days from message_logs, user_sessions, chat_messages
    - Archives deleted data as CSV files in /tmp directory
    - Runs weekly on Sundays at 2 AM

  2. Functionality
    - Queries old records from each table
    - Exports data to CSV files
    - Deletes old records from database
    - Logs cleanup statistics

  3. Security
    - Uses service role key for database operations
    - Implements proper error handling
    - Logs all operations for audit trail
*/

import { corsHeaders } from '../_shared/cors.ts';

interface CleanupStats {
  table: string;
  recordsFound: number;
  recordsDeleted: number;
  archiveFile: string;
  error?: string;
}

// Helper function to convert array of objects to CSV
function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvHeaders = headers.join(',');
  
  // Create CSV data rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined values
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
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
    console.log('Starting data cleanup process...');
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseHeaders = {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
    };

    // Calculate cutoff date (15 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 15);
    const cutoffDateString = cutoffDate.toISOString();
    
    console.log(`Cleanup cutoff date: ${cutoffDateString}`);

    const cleanupResults: CleanupStats[] = [];

    // Tables to cleanup with their date columns
    const tablesToCleanup = [
      { table: 'message_logs', dateColumn: 'created_at' },
      { table: 'user_sessions', dateColumn: 'created_at' },
      { table: 'chat_messages', dateColumn: 'created_at' }
    ];

    // Process each table
    for (const { table, dateColumn } of tablesToCleanup) {
      try {
        console.log(`Processing table: ${table}`);
        
        // Fetch old records
        const fetchResponse = await fetch(
          `${supabaseUrl}/rest/v1/${table}?${dateColumn}=lt.${cutoffDateString}&select=*`,
          {
            method: 'GET',
            headers: supabaseHeaders,
          }
        );

        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch records from ${table}: ${fetchResponse.statusText}`);
        }

        const oldRecords = await fetchResponse.json();
        console.log(`Found ${oldRecords.length} old records in ${table}`);

        const stats: CleanupStats = {
          table,
          recordsFound: oldRecords.length,
          recordsDeleted: 0,
          archiveFile: '',
        };

        if (oldRecords.length > 0) {
          try {
            // Convert to CSV and write archive file
            const csvContent = arrayToCSV(oldRecords);
            
            // Add metadata as comments at the top
            const metadataComments = [
              `# Archive created: ${new Date().toISOString()}`,
              `# Table: ${table}`,
              `# Cutoff date: ${cutoffDateString}`,
              `# Record count: ${oldRecords.length}`,
              `# Columns: ${oldRecords.length > 0 ? Object.keys(oldRecords[0]).join(', ') : 'none'}`,
              ''
            ].join('\n');
            
            const fullCsvContent = metadataComments + csvContent;
            const fileSize = new TextEncoder().encode(fullCsvContent).length;
            
            // Save CSV content to database
            const logResponse = await fetch(`${supabaseUrl}/rest/v1/cleanup_logs`, {
              method: 'POST',
              headers: supabaseHeaders,
              body: JSON.stringify({
                cleanup_date: new Date().toISOString(),
                table_name: table,
                records_found: oldRecords.length,
                records_deleted: 0, // Will be updated after deletion
                csv_content: fullCsvContent,
                file_size: fileSize
              })
            });

            if (!logResponse.ok) {
              throw new Error(`Failed to save cleanup log: ${logResponse.statusText}`);
            }

            const logData = await logResponse.json();
            stats.archiveFile = `Database record: ${logData[0]?.id || 'unknown'}`;
            console.log(`Saved CSV content to database for ${table}`);
          } catch (fileError) {
            console.error(`Failed to save CSV content for ${table}:`, fileError);
            stats.error = `CSV save failed: ${fileError.message}`;
          }

          // Delete old records
          const deleteResponse = await fetch(
            `${supabaseUrl}/rest/v1/${table}?${dateColumn}=lt.${cutoffDateString}`,
            {
              method: 'DELETE',
              headers: supabaseHeaders,
            }
          );

          if (!deleteResponse.ok) {
            throw new Error(`Failed to delete records from ${table}: ${deleteResponse.statusText}`);
          }

          stats.recordsDeleted = oldRecords.length;
          console.log(`Deleted ${oldRecords.length} records from ${table}`);

          // Update the cleanup log with deletion count
          if (!stats.error) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/cleanup_logs?table_name=eq.${table}&cleanup_date=gte.${new Date(Date.now() - 60000).toISOString()}`, {
                method: 'PATCH',
                headers: supabaseHeaders,
                body: JSON.stringify({
                  records_deleted: oldRecords.length
                })
              });
            } catch (updateError) {
              console.error(`Failed to update cleanup log for ${table}:`, updateError);
            }
          }
        }

        cleanupResults.push(stats);

      } catch (tableError) {
        console.error(`Error processing table ${table}:`, tableError);
        cleanupResults.push({
          table,
          recordsFound: 0,
          recordsDeleted: 0,
          archiveFile: '',
          error: tableError.message,
        });
      }
    }

    // Calculate totals
    const totalFound = cleanupResults.reduce((sum, stat) => sum + stat.recordsFound, 0);
    const totalDeleted = cleanupResults.reduce((sum, stat) => sum + stat.recordsDeleted, 0);
    const errors = cleanupResults.filter(stat => stat.error);

    const summary = {
      timestamp: new Date().toISOString(),
      cutoffDate: cutoffDateString,
      totalRecordsFound: totalFound,
      totalRecordsDeleted: totalDeleted,
      tablesProcessed: cleanupResults.length,
      errors: errors.length,
      details: cleanupResults,
    };

    console.log('Cleanup completed:', summary);

    // Log cleanup summary to a JSON file (summary remains JSON for readability)
    const summaryFileName = `/tmp/cleanup_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    try {
      await Deno.writeTextFile(summaryFileName, JSON.stringify(summary, null, 2));
      console.log(`Created summary file: ${summaryFileName}`);
    } catch (summaryError) {
      console.error('Failed to create summary file:', summaryError);
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: `Cleanup completed. Found: ${totalFound}, Deleted: ${totalDeleted}, Errors: ${errors.length}`,
        summary,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in cleanup process:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
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