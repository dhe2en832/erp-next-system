import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters array
    const filters: (string | number | boolean | null | string[])[][] = [
      ['company', '=', company],
      ['status', '=', 'Open'] // Only open projects
    ];

    // Add search filter if provided
    if (search) {
      filters.push(['project_name', 'like', `%${search}%`]);
    }

    interface ProjectSummary {
      name: string;
      project_name: string;
      company: string;
      status: string;
      expected_start_date?: string;
      expected_end_date?: string;
      [key: string]: unknown;
    }

    // Get projects from ERPNext
    const projects = await client.getList<ProjectSummary>('Project', {
      fields: ['name', 'project_name', 'company', 'status', 'expected_start_date', 'expected_end_date'],
      filters,
      order_by: 'project_name asc',
      limit_page_length: 100
    });

    // Format projects for dropdown
    const formattedProjects = projects.map((project: ProjectSummary) => ({
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

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/projects', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
