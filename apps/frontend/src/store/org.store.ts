import { create } from 'zustand';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  logoUrl?: string;
}

interface OrgState {
  organizations: Organization[];
  activeOrganization: Organization | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  
  setOrganizations: (orgs: Organization[]) => void;
  setActiveOrganization: (org: Organization | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  organizations: [],
  activeOrganization: null,
  workspaces: [],
  activeWorkspace: null,
  
  setOrganizations: (organizations) => set({ organizations }),
  setActiveOrganization: (activeOrganization) => set({ activeOrganization }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
}));
