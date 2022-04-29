const core = require('@actions/core');
const github = require('@actions/github');

(async() => {
  try {
    core.notice('Check File Action Called');
  }
  catch (error) {
    core.setFailed(error.message);
  }
})();