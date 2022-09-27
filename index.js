const core = require('@actions/core');
const github = require('@actions/github');
const fs = require("fs");

async function createAnnotation(annotations, engineName, failOnError) {
  const token = core.getInput('repo-token');
  const octokit = new github.getOctokit(token);
  core.info('Attempting to create annotation');
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

  core.info(`Annotation created with check value ${JSON.stringify(check)}`);
}

async function readScannerResults() {
  // booleans still come across as strings so convert to an actual boolean
  const failOnError = core.getInput('fail-on-error').toLowerCase() === 'true' ? true : false;
  const fileName = core.getInput('path').toLowerCase();
  const fs = require("fs").promises;
  var result = await fs.readFile(fileName, 'utf8');
  const json = JSON.parse(result);

  const maxAnnotations = 50;
  let annotationCount = 1;

  for(let engine of json) {
    const engineName = engine.engine.toUpperCase();
    core.info(`Processing results for the ${engineName} engine.`);
    const fileName = engine.fileName;
    const annotations = [];

    core.info(`${engine.violations.length} violation(s) for ${engineName}`);

    for (let violation of engine.violations) {
      if (annotationCount > maxAnnotations) {
        core.warning(`there were more than ${maxAnnotations} annotations so only the first ${maxAnnotations} are shown.`);
        break;
      }

      annotationCount++;

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
      await createAnnotation(annotations, engineName, failOnError);
    }
    catch(error){
      core.warning(`Failed to create annotations on first attempt for the ${engineName} Engine.  This is usually due to the line and column numbers returned from the report.  The values will be modified and a second attempt will be made.`);
      for (const annotation of annotations) {
        annotation.message = `${annotation.message}\n\nThere was an issue with the line details of the annotation so the end line and end column values were modified.\nOriginal Values:\nStart Line: ${annotation.start_line}\nEnd Line: ${annotation.end_line}\nStart Column: ${annotation.start_column}\nEnd Column: ${annotation.end_column}\n`;

        annotation.end_line = annotation.start_line;
        annotation.end_column = annotation.start_column;
      }

      try {
        core.info('Second attempt at creating annotations');
        await createAnnotation(annotations, engineName, failOnError);
        core.info('Annotations created');
      }
      catch (finalError) {
        const errorMessage = `Failed to created annotation for the ${engineName} Engine:\n${finalError.message}\nReview the artifacts for more information`;
        core.error(errorMessage);
        if (failOnError) {
          core.setFailed(errorMessage);
          core.set
        }
      }
    }
  }
}

(async () => {
  try {
    await readScannerResults();
  }
  catch (error) {
    core.setFailed('Failed to Execute Action: ' + error.message);
  }
})();
