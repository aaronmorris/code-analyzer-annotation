const core = require('@actions/core');
const github = require('@actions/github');
const fs = require("fs");

async function readScannerResults() {
  // booleans still come across as strings so convert to an actual boolean
  const failOnError = core.getInput('fail-on-error').toLowerCase() === 'true' ? true : false;
  const token = core.getInput('repo-token');
  const json = JSON.parse(core.getInput('json'));

  const octokit = new github.getOctokit(token);

  for(let engine of json) {
    const engineName = engine.engine.toUpperCase();
    const fileName = engine.fileName;
    const annotations = [];

    for (let violation of engine.violations) {
      const annotation = {
        path: fileName,
        start_line: violation.line ? parseInt(violation.line) : 1,
        end_line: violation.endLine ? parseInt(violation.endLine) : parseInt(violation.line) ,
        annotation_level: 'failure',
        message: `${violation.message.trim()}\n${violation.ruleName}\n${violation.url}`,
        start_column: violation.column ? parseInt(violation.column) : 1,
        end_column: violation.endColumn ? parseInt(violation.endColumn) : parseInt(violation.column)
      };

      annotations.push(annotation);
    }

    try {
      const check = await octokit.rest.checks.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        name: `${engineName} Violation`,
        head_sha: github.context.sha,
        status: 'completed',
        conclusion: failOnError ? 'failure' : 'neutral',
        output: {
          title: `${engineName} Violation`,
          summary: `Please review the following ${engineName} Violation`,
          annotations: annotations
        }
      });
    }
    catch(error){
      core.error('Failed to create annotations.  This is usually due to the line and column numbers returned from the report.  The values will be modified and a second attempt will be made.');
      for (const annotation of annotations) {
        annotation.message = `${annotation.message}\n\nThere was an issue with the line details of the annotation so the end line and end column values were modified.\nOriginal Values:\nStart Line: ${annotation.start_line}\nEnd Line: ${annotation.end_line}\nStart Column: ${annotation.start_column}\nEnd Column: ${annotation.end_column}\n`;

        annotation.end_line = annotation.start_line;
        annotation.end_column = annotation.start_column;
      }

      try {
        const check = await octokit.rest.checks.create({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          name: `${engineName} Violation`,
          head_sha: github.context.sha,
          status: 'completed',
          conclusion: failOnError ? 'failure' : 'neutral',
          output: {
            title: `${engineName} Violation`,
            summary: `Please review the following ${engineName} Violation`,
            annotations: annotations
          }
        });
      }
      catch (finalError) {
        core.error('Failed to created annotation: ' + finalError.message);
      }
    }
  }

  core.info('end readScannerResults');
}

(async () => {
  try {
    await readScannerResults();
  }
  catch (error) {
    core.setFailed(error.message);
  }
})();