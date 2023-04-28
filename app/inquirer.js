const inquirer    = require('inquirer');
const chalk       = require('chalk');

module.exports = {

  askContinueAnyway: async (text) => {
    console.log(chalk.yellow(text));

    prompt = await inquirer.prompt([
      {
        name: 'continue',
        default: 'n',
        type: 'input',
        message: 'Do you want to continue anyway? (y/n)',
        validate: function( value ) {
          if (value == 'n' || value == 'y' || value == 'no' || value == 'yes') {
            return true;
          } else {
            return 'Please enter y or n';
          }
        }
      }
    ]);

    return prompt.continue == 'yes' || prompt.continue == 'y';
  },

  askConfirm: async (text) => {
    prompt = await inquirer.prompt([
      {
        name: 'continue',
        default: 'n',
        type: 'input',
        message: text || 'Are you sure? (y/n)',
        validate: function( value ) {
          if (value == 'n' || value == 'y' || value == 'no' || value == 'yes') {
            return true;
          } else {
            return 'Please enter y or n';
          }
        }
      }
    ]);

    return prompt.continue == 'yes' || prompt.continue == 'y';
  },


  askListChoice: async (message, list) => {

    prompt = await inquirer.prompt([
      {
        name: 'choice',
        type: 'list',
        choices: list,
        message: message
      }
    ]);

    return prompt.choice;
  },

  ask: async (text, errorText, hidden) => {

    prompt = await inquirer.prompt([
      {
        name: 'value',
        default: '',
        type: hidden?'password':'input',
        message: chalk.yellow(text),
        validate: function( value ) {
          if (value) {
            return true;
          } else {
            return errorText || 'Please enter a value';
          }
        }
      }
    ]);

    return prompt.value;
  },

};