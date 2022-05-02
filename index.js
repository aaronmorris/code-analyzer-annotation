const core = require('@actions/core');
const github = require('@actions/github');
const fs = require("fs");
const { connected } = require('process');

async function readScannerResults() {
  const path = core.getInput('path');
  core.info(`json path: ${core.getInput('path')}`);
  // const jsonData = require(path);
  // core.info('JSON: ' + jsonData);
  const resultData = fs.readFile(path, 'utf-8', function(error, data) {
    // core.setFailed(`Unable to read file ${path}`);
    // return;
  });

  // core.info(resultData);
  // core.info(JSON.parse(resultData));

  const token = core.getInput('repo-token');
  const failOnError = core.getInput('fail-on-error');
  core.info(`token: "${token}"`);
  const octokit = new github.getOctokit(token);

  const json = JSON.parse(core.getInput('json'));
  core.info('json: ' + json[0].engine);

  for(let engine of json) {
    core.info('in loop');
    core.info(engine);
    const engineName = engine.engine.toUpperCase();
    const fileName = engine.fileName;
    const annotations = [];
    core.info('fileName: ' + fileName);
    core.info('engineName: ' + engineName);
    for (let violation of engine.violations) {
      const annotation = {
        path: fileName,
        start_line: violation.line ? parseInt(violation.line) : 1,
        end_line: violation.endLine ? parseInt(violation.endLine) : parseInt(violation.line) ,
        annotation_level: 'failure',
        message: `${violation.message.trimStart()} ${violation.url}`,
        start_column: violation.column ? parseInt(violation.column) : 1,
        end_column: violation.endColumn ? parseInt(violation.endColumn) : parseInt(violation.column)
      };

      core.info('path: ' + annotation.path);
      core.info('startline: ' + annotation.start_line);
      core.info('endline: ' + annotation.end_line);
      core.info('annotationlevel: ' + annotation.annotation_level);
      core.info('message: ' + annotation.message);
      core.info('startcolumn: ' + annotation.start_column);
      core.info('endcolumn: ' + annotation.end_column);

      core.info(`Annotation: ${annotation}`);
      // annotations.push(annotation);
    }

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