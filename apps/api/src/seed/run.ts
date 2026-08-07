import { loadConfig } from "../config.js";
import { createSeededStore } from "./demoData.js";

const config = loadConfig();
const store = await createSeededStore(config);
const snapshot = await store.snapshot();

console.log(
  JSON.stringify(
    {
      organizations: snapshot.organizations.length,
      departments: snapshot.departments.length,
      teams: snapshot.teams.length,
      employees: snapshot.employees.length,
      skills: snapshot.skills.length,
      projects: snapshot.projects.length,
      documents: snapshot.documents.length,
      relationshipAssignments: snapshot.employeeProjects.length + snapshot.employeeSkills.length
    },
    null,
    2
  )
);
