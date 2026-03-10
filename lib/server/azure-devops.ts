import 'server-only';

import { IntegrationProvider } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';
import { decryptSecret } from '@/lib/server/security';

interface AzureProjectResponse {
  value?: Array<{
    id: string;
    name: string;
    state?: string;
  }>;
}

interface AzureWorkItemTypeResponse {
  value?: Array<{
    name: string;
  }>;
}

interface AzureWiqlResponse {
  workItems?: Array<{ id: number }>;
}

interface AzureWorkItemsResponse {
  value?: Array<{
    id: number;
    fields?: Record<string, unknown>;
  }>;
}

interface AzureWorkItemResponse {
  id: number;
  fields?: Record<string, unknown>;
}

export interface AzureProject {
  id: string;
  name: string;
}

export interface AzureEpic {
  id: number;
  title: string;
}

interface AzureConfig {
  organizationUrl: string;
  pat: string;
}

async function getConfig(): Promise<AzureConfig> {
  const integration = await prisma.workspaceIntegration.findUnique({
    where: {
      provider: IntegrationProvider.azure_devops,
    },
  });

  if (!integration) {
    throw new Error('Azure DevOps integration is not configured.');
  }

  return {
    organizationUrl: integration.organizationUrl.replace(/\/+$/, ''),
    pat: decryptSecret(integration.encryptedPat),
  };
}

function buildAuthHeader(pat: string): string {
  const encoded = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${encoded}`;
}

async function azdoRequest<T>(
  config: AzureConfig,
  path: string,
  init?: RequestInit,
  expectedStatus = 200
): Promise<T> {
  const url = `${config.organizationUrl}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: buildAuthHeader(config.pat),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(`Azure DevOps request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function listAzureProjects(): Promise<AzureProject[]> {
  const config = await getConfig();
  const payload = await azdoRequest<AzureProjectResponse>(
    config,
    '/_apis/projects?api-version=7.1-preview.4'
  );
  return (payload.value || []).map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

export async function listAzureEpics(projectName: string): Promise<AzureEpic[]> {
  const config = await getConfig();
  const wiql = await azdoRequest<AzureWiqlResponse>(
    config,
    `/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.1`,
    {
      method: 'POST',
      body: JSON.stringify({
        query:
          "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Epic' ORDER BY [System.ChangedDate] DESC",
      }),
    }
  );

  const ids = (wiql.workItems || []).map((item) => item.id);
  if (ids.length === 0) {
    return [];
  }

  const workItems = await azdoRequest<AzureWorkItemsResponse>(
    config,
    `/${encodeURIComponent(projectName)}/_apis/wit/workitems?ids=${ids.join(
      ','
    )}&fields=System.Id,System.Title&api-version=7.1`
  );

  return (workItems.value || []).map((item) => ({
    id: item.id,
    title: String(item.fields?.['System.Title'] || `Epic ${item.id}`),
  }));
}

export async function detectWorkItemTypes(projectName: string): Promise<{
  featureType: string;
  storyType: string;
}> {
  const config = await getConfig();
  const payload = await azdoRequest<AzureWorkItemTypeResponse>(
    config,
    `/${encodeURIComponent(projectName)}/_apis/wit/workitemtypes?api-version=7.1`
  );

  const names = (payload.value || []).map((item) => item.name);
  const featureType = ['Feature', 'Requirement'].find((name) => names.includes(name)) || 'Feature';
  const storyType =
    ['User Story', 'Product Backlog Item', 'Issue', 'Task'].find((name) => names.includes(name)) ||
    'User Story';

  return { featureType, storyType };
}

interface WorkItemPatchField {
  op: 'add' | 'replace';
  path: string;
  value: unknown;
}

interface ParentRelation {
  parentId: number;
}

function withParentRelation(
  operations: WorkItemPatchField[],
  config: AzureConfig,
  parent?: ParentRelation
): Array<WorkItemPatchField | Record<string, unknown>> {
  if (!parent) {
    return operations;
  }
  return [
    ...operations,
    {
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: `${config.organizationUrl}/_apis/wit/workItems/${parent.parentId}`,
      },
    },
  ];
}

export async function createAzureWorkItem(params: {
  projectName: string;
  workItemType: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  parentId?: number;
}): Promise<number> {
  const config = await getConfig();
  const operations: WorkItemPatchField[] = [
    { op: 'add', path: '/fields/System.Title', value: params.title },
  ];

  if (params.description) {
    operations.push({ op: 'add', path: '/fields/System.Description', value: params.description });
  }

  if (params.acceptanceCriteria) {
    operations.push({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
      value: params.acceptanceCriteria,
    });
  }

  const payload = withParentRelation(operations, config, params.parentId ? { parentId: params.parentId } : undefined);

  const result = await azdoRequest<AzureWorkItemResponse>(
    config,
    `/${encodeURIComponent(params.projectName)}/_apis/wit/workitems/$${encodeURIComponent(
      params.workItemType
    )}?api-version=7.1`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(payload),
    },
    200
  );
  return result.id;
}

export async function updateAzureWorkItem(params: {
  projectName: string;
  workItemId: number;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
}): Promise<void> {
  const config = await getConfig();
  const operations: WorkItemPatchField[] = [
    { op: 'replace', path: '/fields/System.Title', value: params.title },
    { op: 'replace', path: '/fields/System.Description', value: params.description || '' },
  ];

  if (typeof params.acceptanceCriteria === 'string') {
    operations.push({
      op: 'replace',
      path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
      value: params.acceptanceCriteria,
    });
  }

  await azdoRequest<AzureWorkItemResponse>(
    config,
    `/${encodeURIComponent(params.projectName)}/_apis/wit/workitems/${params.workItemId}?api-version=7.1`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(operations),
    },
    200
  );
}
