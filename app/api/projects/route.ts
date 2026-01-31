import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Projects API - Company:', company);
    console.log('Projects API - Search:', search);

    // Build filters array
    const filters = [
      ['company', '=', company],
      ['status', '=', 'Open'] // Only open projects
    ];

    // Add search filter if provided
    if (search) {
      filters.push(['project_name', 'like', `%${search}%`]);
    }

    console.log('Projects API - Final Filters:', filters);

    // Get projects from ERPNext
    const url = `${ERPNEXT_API_URL}/api/resource/Project?fields=["name","project_name","company","status","expected_start_date","expected_end_date"]&filters=${encodeURIComponent(JSON.stringify(filters))}&order_by=project_name asc&limit_page_length=100`;

    console.log('Projects API - URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64')}`
      },
    });

    console.log('Projects API - Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Projects API - Response Data:', data);

      if (data.success && data.data) {
        // Format projects for dropdown
        const formattedProjects = data.data.map((project: any) => ({
          name: project.name,
          project_name: project.project_name,
          company: project.company,
          status: project.status,
          expected_start_date: project.expected_start_date,
          expected_end_date: project.expected_end_date,
          display_name: `${project.name} - ${project.project_name}`
        }));

        return NextResponse.json({
          success: true,
          data: formattedProjects,
          message: `Found ${formattedProjects.length} projects`
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No projects found',
          data: []
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Projects API - Error:', errorText);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch projects from ERPNext',
        error: errorText
      });
    }

  } catch (error: any) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
