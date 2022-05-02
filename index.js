const core = require('@actions/core');
const github = require('@actions/github');
const fs = require("fs");

async function readScannerResults() {
  const token = core.getInput('repo-token');
  const failOnError = core.getInput('fail-on-error');
  core.info(`token: "${token}"`);
  const octokit = new github.getOctokit(token);

  const json = JSON.parse(core.getInput('json'));
  core.info('json: ' + json[0].engine);

  for(let engine of json) {
    const engineName = engine.engine.toUpperCase();
    const fileName = engine.fileName;
    const annotations = [];

    for (let violation of engine.violations) {
      core.info('next violation');
      const annotation = {
        path: fileName,
        start_line: violation.line ? parseInt(violation.line) : 1,
        end_line: violation.endLine ? parseInt(violation.endLine) : parseInt(violation.line) ,
        annotation_level: 'failure',
        message: `${violation.message.trim()}\n${violation.ruleName}\n${violation.url}`,
        start_column: violation.column ? parseInt(violation.column) : 1,
        end_column: violation.endColumn ? parseInt(violation.endColumn) : parseInt(violation.column)
      };

      core.info(`Annotation: ${annotation}`);
      try {
        annotations.push(annotation);
      }
      catch (firstError) {
        core.info('first error');
        // sometimes the line and column numbers cause issues:
        // annotation.start_line = 1;
        // annotation.end_line = 1;
        // annotation.start_column = 1;
        // annotation.end_column = 1;
        // annotation.message = `There was an issue with the line details of the annotation so they will be incorrect.\n${annotation.message}`;

        // annotations.push(annotation);
      }
      core.info('annotation pushed');
    }

    core.info('lets assign those annotations');
    core.info('failOnError: ' + failOnError);
    core.info('result: ' + (failOnError ? 'failure' : 'neutral'));
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
      core.info('format error');
      for (const annotation of annotations) {
        core.info('annotation.start_line: ' + annotation.start_line);
        // sometimes the line and column numbers cause issues:

        annotation.message = `${annotation.message}\n\nThere was an issue with the line details of the annotation so they will be incorrect.\nOriginal Values:\nStart Line: ${annotation.start_line}\nEnd Line: ${annotation.end_line}\nStart Column: ${annotation.start_column}\nEnd Column: ${annotation.end_column}\n`;

        annotation.start_line = 1;
        annotation.end_line = 1;
        annotation.start_column = 1;
        annotation.end_column = 1;

        core.info('annotation.start_line: ' + annotation.start_line);
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
    // checkFileExistence('README.md');
    // checkFileExistence('LICENSE');

    // if (await checkFileStartsWithHeader('README.md')) {
    //   core.info('File starts with header so no further action is needed.');
    //   return;
    // }

    // get token for octokit
    // const token = core.getInput('repo-token');
    // const token = core.getInput('repo-token');
    // core.info(`token: "${token}"`);
    // const octokit = new github.getOctokit(token);

    // call octokit to create a check with annotation and details
    // const check = await octokit.rest.checks.create({
    //   owner: github.context.repo.owner,
    //   repo: github.context.repo.repo,
    //   name: 'Readme Validator',
    //   head_sha: github.context.sha,
    //   status: 'completed',
    //   conclusion: 'failure',
    //   output: {
    //     title: 'README.md must start with a title',
    //     summary: 'Please use markdown syntax to create a title',
    //     annotations: [
    //       {
    //         path: 'README.md',
    //         start_line: 1,
    //         end_line: 1,
    //         annotation_level: 'failure',
    //         message: 'README.md must start with a header',
    //         start_column: 1,
    //         end_column: 1
    //       }
    //     ]
    //   }
    // });
  }
  catch (error) {
    core.setFailed(error.message);
  }
})();