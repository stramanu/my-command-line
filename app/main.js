const shell = require('shelljs');
const _sudo = require('sudo-prompt');
const bcrypt = require('bcrypt');
const child_process = require('child_process');
const globalConf = require('../global-mcl.json');
const chalk = require('chalk');
const fs = require('fs');
const cryptr = require('cryptr');
const clipboardy = require('clipboardy');
const inquirer = require('./inquirer');

let dryRun = false;
let ttyShell = false;
let crossEnv = false;
let shellShareVars = false;

shell.sudo = (cmd, opt) => {
    let def = { name: 'mcl' };
    if (typeof opt === 'undefined') {
        opt = def;
    }else{
        opt = {...def, ...opt};
    }
    return new Promise((resolve, reject) => {
        _sudo.exec(cmd, opt, (error, stdout, stderr) => {
            if (error){
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function arr_diff(a1, a2) {
    let a = [], diff = [];
    for (let i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }
    for (let i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }
    for (let k in a) {
        diff.push(k);
    }
    return diff;
}

function similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

async function printHelp(obj, stack, env) {
    let ret = '';
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const item = obj[key];
            if ((item instanceof Object) && !(item instanceof Array)) {
                ret += await printHelp(item, stack + ' ' + key, env);
            } else if (`${(`${stack.trim()} ${key}`).trim()}`[0] != '.') {
                let comment = await _process_scripts_vars([], 0, item instanceof Array ? item[1] || '' : '', {}, env);
                ret += `
        mcl ${(`${stack.trim()} ${key}`).trim()} ${comment}`;
            }
        }
    }
    return ret;
}

const adjCommentTab = (txt) => {
    let lines = txt.split('\n')
    let maxCommIdx = 0;
    lines.forEach(line => {
        maxCommIdx = Math.max(line.indexOf('#'), maxCommIdx);
    })
    lines.forEach((line, i) => {
        let commIdx = line.indexOf('#');
        if(commIdx > 0) lines[i] = line.replace(/#/, (new Array(maxCommIdx - commIdx).fill(' ').join('')) + '#');
    })
    return lines.join('\n');
}

const workingDirPath = () => {
    return process.cwd();
}

let localConf;
try {
    localConf = require(`${workingDirPath()}/mcl.json`)
} catch (error) { }

const _edit_cli_conf = async (editor) => {
    let sshTerm = child_process.spawn(editor || 'nano', [`${__dirname}/../global-mcl.json`], {
        stdio: 'inherit'
    });
    sshTerm.on('exit', function (code, signal) {
        if (code === 0) {
            // process completed successfully
        } else {
            // handle error
        }
    });
}

const _init_local = async () => {
    shell.exec(`cp ${__dirname}/../local-mcl.default.json ${workingDirPath()}/mcl.json`);
}

const _read_inline_mcl_params = (str) => {
    if (str.indexOf(" --mcl-share-vars") > 0) {
        str = str.replace(" --mcl-share-vars", "");
        shellShareVars = true;
    }
    
    if (str.indexOf(" --mcl-tty") > 0) {
        str = str.replace(" --mcl-tty", "");
        ttyShell = true;
    }
    return str;
}

const _process_scripts_vars = async (args, keyIdx, script, params, context) => {
    let ctxLocal = (localConf && (context == 'local'));
    let conf;
    if (ctxLocal) {
        conf = localConf;
    } else {
        conf = globalConf;
    }

    if (script instanceof Array) {
        script = script[0];
    }
    script = script.replace(new RegExp('\\$__dirname', 'g'), ctxLocal ? workingDirPath() : __dirname);

    if (conf.vars) {
        let varKeys = Object.keys(conf.vars);     
        for (let i = 0; i < varKeys.length ; i++) { 
            const _var_i = varKeys[i];

            // Capture "$(command)"
            let exec_match = conf.vars[_var_i].match(/\w*(?<!\\)\$\((.*?)\)/g);
            if (exec_match) {
                for (let i = 0; i < exec_match.length; i++) {
                    const match = exec_match[i];
                    const cmd = match.substr(2,match.length-3);
                    let { stdout, code, stderr } = shell.exec(cmd, {silent: true})
                    if (code != 0) {
                        console.log(chalk.red.bold('>_ mcl Error: ' + match));
                        console.log(chalk.red.bold(stderr));
                        throw ''
                    }
                    conf.vars[_var_i] = conf.vars[_var_i].replace(match, stdout);
                }
            }  

            // Clear "\$(command)" 
            let clear_match = conf.vars[_var_i].match(/\\\$\((.*?)\)/g);
            if (clear_match) {
                for (let i = 0; i < clear_match.length; i++) {
                    const match = clear_match[i];
                    conf.vars[_var_i] = conf.vars[_var_i].replace(match, match.substr(1));
                }
            }  



            for (let j = varKeys.length -1; j >= 0 ; j--) {
                const _var_j = varKeys[j];
                if (conf.vars[_var_i].indexOf(_var_j) >= 0 && _var_j != _var_i) {
                    conf.vars[_var_i] = conf.vars[_var_i].replace(new RegExp('\\$'+_var_j, 'g'), conf.vars[_var_j]);
                }
            }

            script = script.replace(new RegExp('\\$'+_var_i, 'g'), conf.vars[_var_i]);  
        }  
    }
    
    script = _read_inline_mcl_params(script);

    let parMatch;
    while (parMatch = script.match(/\$(\d+)/)) {
        let defMatch = script.match(/\$(\d+)\$\((.*?)\)/)
        if (defMatch && +parMatch[1] != +defMatch[1]) defMatch = null;
        let parSrc = parMatch[0];
        let parIdx = +parMatch[1];
        let param = args[keyIdx + parIdx];
        if(typeof param === "undefined"){
            if(defMatch){
                script = script.replace(defMatch[0], defMatch[2]);
            }else if (script[script.indexOf(parMatch[0]) -1] == '?'){
                script = script.replace(' ?' + parMatch[0], '');
            }else{
                throw chalk.red.bold(`>_ mcl Error: "${parSrc}" is undefined`)
            }
        }else{
            if(defMatch){
                script = script.replace(defMatch[0], param);
            }else if (script[script.indexOf(parMatch[0]) -1] == '?'){
                script = script.replace(' ?' + parMatch[0], ' ' + param);
            }else{
                script = script.replace(parSrc, param);
            }
        }                
    }

    return script;
}

const _process_script_args_input = async (script, args, params, keys) => {
    let scriptArray = typeof script !== 'string' && (script instanceof Array);
    let cmd;
    if(scriptArray){
        cmd = script[0];
    }else{
        cmd = script;
    }
    let inlinePar = '';
    for (const param in params) {
        if (params.hasOwnProperty(param)) {
            inlinePar += `--${param}=${params[param]} `;
        }
    }
    cmd = cmd.replace('$__params', ` ${inlinePar.trim()}`);
    let __args = (arr_diff(keys, args) || []).join(' ');
    cmd = cmd.replace('$__args', `${__args}`);
    cmd = cmd.replace('$@', `${__args}`);
    if(scriptArray){
        script[0] = cmd;
    }else{
        script = cmd;
    }
    return script;
}

const _process_scripts = async (args, params, context) => {
    let ctxLocal = (localConf && (context == 'local'));
    let conf;
    if (ctxLocal) {
        conf = localConf;
    } else {
        conf = globalConf;
    }

    if (conf.scripts[args[0]]) {
        let keyIdx = 0;
        let key = args[keyIdx];
        let script = conf.scripts[key];
        let keys = [key]

        while (typeof script !== 'string' && !(script instanceof Array)) {
            key = args[++keyIdx];
            script = script[key];
            keys.push(key);
            if (!script) break;
        }
        
        if (script) {
            script = await _process_script_args_input(script, args, params, keys);
            return await _process_scripts_vars(args, keyIdx, script, params, context);
        }
    }
}

const _exec_script = async (script, params, context) => {
    if (params && script.indexOf('--mcl-crossenv') >= 0) {
        let envs = Object.keys(params).map(k => `--${k}${params[k] ? `="${params[k]}"` : ''}`).join(' ')
        script = script.replace(/\-\-mcl\-crossenv/g, `--mcl-crossenv ${envs}`)
    }
    let ctxLocal = (localConf && (context == 'local'));
    let conf;
    if (ctxLocal) {
        conf = localConf;
    } else {
        conf = globalConf;
    }
    if ((script.indexOf('sh ') == 0 || script.indexOf('bash ') == 0) && shellShareVars && conf.vars && Object.keys(conf.vars).length) {
        for (const _var in conf.vars) {
            if (conf.vars.hasOwnProperty(_var)) {
                script = `${_var}=${JSON.stringify(conf.vars[_var])} ${script}`;
            }
        }
        script = 'env ' + script;
    }
    
    console.log(dryRun? chalk.yellow('DRY RUN') : ''); 
    console.log(chalk.cyan.bold('>_ mcl\n' + script));
    console.log();
    
    if (!dryRun) {
        if (script.indexOf('ssh ') == 0) {
            let sshArgs = script.replace(/^ssh\ /, '').match(/"(?:\\"|\\\\|[^"])*"|\S+/g);
            for (let i = 0; i < sshArgs.length; i++) {
                let arg = sshArgs[i];
                if ((arg[0] == "\"" && arg[arg.length-1] == "\"") ||
                    (arg[0] == "'" && arg[arg.length-1] == "'") ||
                    (arg[0] == "`" && arg[arg.length-1] == "`")) {
                    sshArgs[i] = arg.substr(1, arg.length-2);
                }
            }
            _ssh(sshArgs);
        }else if(ttyShell){
            let ttyTerm = child_process.spawn("/bin/sh", ['-c', script], {
                stdio: 'inherit'
            });
            ttyTerm.on('exit', function (code, signal) {
                if (code === 0) {
                    // process completed successfully
                } else {
                    // handle error
                }
            });
        }else{
            shell.exec(script);
        }
    }
}

const _ssh = async (args) => {
    let sshTerm = child_process.spawn('ssh', ['-tt'].concat(args), {
        stdio: 'inherit'
    });
    sshTerm.on('exit', function (code, signal) {
        if (code === 0) {
            // process completed successfully
        } else {
            // handle error
        }
    });
}

const _vbx_usb = async (args) => {
    const MC_NAME = "vbx-usb-map";
    const VBX_DK_ENV_CMD = `eval $(docker-machine env ${MC_NAME})`;

    const _vbx_check = async () => {
        let { code } = shell.exec(`hash VBoxManage`, {silent: true})
        if (code != 0) {
            console.log(chalk.yellow.bold('Warning: VirtualBox not found...\nPlease install it from:'));
            console.log(chalk.cyan.bold('https://www.virtualbox.org/wiki/Downloads'));
            throw ''
        }
    }

    const _vbx_usb_init = async () => {
        await _vbx_check();
        shell.exec(`docker-machine create ${MC_NAME}`);
        await _vbx_usb_stop();
        shell.exec(`VBoxManage modifyvm ${MC_NAME} --usb on`);
        await _vbx_usb_start();
    }

    const _vbx_usb_start = async () => {
        await _vbx_check();
        shell.exec(`docker-machine start ${MC_NAME}`);
    }

    const _vbx_usb_stop = async () => {
        shell.exec(`docker-machine stop ${MC_NAME}`);
    }

    const _vbx_usb_start_container = async () => {
        shell.exec(`${VBX_DK_ENV_CMD} && docker run -it --rm --privileged --name=ubuntu -d -v /dev/bus/usb:/dev/bus/usb ubuntu bash`);
    }

    const _vbx_usb_stop_container = async () => {
        shell.exec(`${VBX_DK_ENV_CMD} && docker container stop ubuntu`);
    }

    const _vbx_usb_devices = async () => {
        await _vbx_check();
        let {stdout} = shell.exec(`VBoxManage list usbhost`, {silent: true});
        let devices = stdout.split('\n\n').filter(a => a.indexOf('UUID') == 0).map(line => {
            let lines = line.split('\n');
            // let name = lines.filter(a => a.indexOf('Product:') == 0)[0].replace('Product:', '').trim();
            // let uuid = lines.filter(a => a.indexOf('UUID:') == 0)[0].replace('UUID:', '').trim();
            // return {name, uuid}
            let dev = {};
            lines.forEach(line => {
                let el = line.split(': ');
                dev[el[0].trim()] = el[1].trim();
            });
            return dev
        })
        return devices;
    }

    const _vbx_usb_list = async () => {
        console.table((await _vbx_usb_devices()).map(dev => ({name: dev.Product, uuid: dev.UUID})));
    }

    const _vbx_usb_attach = async (args) => {
        let devices = await _vbx_usb_devices();
        let uuid = args[0];
        let dev;
        if (!uuid) {
            let name = await inquirer.askListChoice('Choose a usb device', devices.map(d => (d.Product)));
            dev = devices.find(a => a.Product == name);
        }else{
            dev = devices.find(a => a.UUID == uuid);
        }
        let {code} = shell.exec(`VBoxManage controlvm ${MC_NAME} usbattach ${dev.UUID}`);
        if (code == 0) {
            console.log(chalk.green.bold(`Device ${dev.Product} attached √`));
        }
    }

    switch (args[0]) {

        case 'init':
            await _vbx_usb_init()
            break;

        case 'start':
            await _vbx_usb_start()
            break;

        case 'stop':
            await _vbx_usb_stop()
            break;

        case 'list':
            await _vbx_usb_list(args.splice(1))
            break;

        case 'attach':
            await _vbx_usb_attach(args.splice(1))
            break;

        case 'start-cont':
            await _vbx_usb_start_container()
            break;

        case 'stop-cont':
            await _vbx_usb_stop_container()
            break;

        case 'env':
            console.log(chalk.blue.bold(`eval $(docker-machine env ${MC_NAME})`));
            break;

        case 'env-reset':
            console.log(chalk.blue.bold(`eval $(docker-machine env -u)`));
            break;

        default:
            break;
    }
}

const _key = async (args) => {

    const _key_init = async () => {
        shell.exec(`touch {${__dirname}/../.keychain,${__dirname}/../.keychain.key,${__dirname}/../.keychain.keyhash}`);
        await _key_reset(true);
    }

    const _key_reset = async (init) => {
        try {

            // Prompt new password
            let newKeychainKey = '';
            let newKeychainKeyConfirm = '';
    
            do{
                newKeychainKey = await inquirer.ask("Enter new password", "Please enter a valid password", true)
                newKeychainKeyConfirm = await inquirer.ask("Confirm new password", "Please enter a valid password", true)
        
                if (newKeychainKey != newKeychainKeyConfirm) {
                    console.log(chalk.yellow.bold(`Passwords does not match...`));
                }
            }
            while(newKeychainKey != newKeychainKeyConfirm);

            const newKeychainCrypt = new cryptr(newKeychainKey);

            // Read keychain key / Write keychain.key
            const keychainKey = (await shell.sudo(`key=$(<'${__dirname}/../.keychain.key') && echo '${newKeychainKey}' > ${__dirname}/../.keychain.key && chmod 000 ${__dirname}/../.keychain.key && echo $key`, { 
                name: `mcl Keychain ${(init? 'Init':'Reset')}` 
            })).trim();

            let keychain = {};
            
            if (keychainKey) {
                const keychainCrypt = new cryptr(keychainKey);
    
                // Read keychain file
                let keychainFile = '{}';
                
                try {
                    keychainFile = fs.readFileSync(`${__dirname}/../.keychain`, { encoding: 'utf8' }) || keychainFile
                } catch (error) {}
                keychain = JSON.parse(keychainFile);
    
                // Decrypt / Encrypt
                for (const key in keychain) {
                    if (keychain.hasOwnProperty(key)) {
                        keychain[key] = newKeychainCrypt.encrypt(keychainCrypt.decrypt(keychain[key]));
                    }
                }
    
            }

            // Write keychain
            fs.writeFileSync(`${__dirname}/../.keychain`, JSON.stringify(keychain, null, 2), { encoding: 'utf8' });

            fs.writeFileSync(`${__dirname}/../.keychain.keyhash`, await bcrypt.hash(newKeychainKey, 10), { encoding: 'utf8' });

            console.log(chalk.green.bold(`Keychain password has been ${(init? 'initialized':'resetted')}`));

        } catch (error) {
            // Revert all
            
            console.log(chalk.red.red(error));
            console.log(chalk.red.bold(`Keychain password ${(init? 'init':'reset')} error... Reverting...`));

            // Write initial keychain
            fs.writeFileSync(`${__dirname}/../.keychain`, keychainFile, { encoding: 'utf8' });

            // Write initial keychain.key
            await shell.sudo(`echo '${keychainKey}' > ${__dirname}/../.keychain.key`, { name: `mcl Keychain ${(init? 'Init':'Reset')}` });

            fs.writeFileSync(`${__dirname}/../.keychain.keyhash`, await bcrypt.hash(keychainFile, 10), { encoding: 'utf8' });
            
            console.log(chalk.red.bold(`Done`));
        }
    }

    const _key_add = async (args) => {
        let keyName = args[0];

        // Read keychain file
        let keychainFile = fs.readFileSync(`${__dirname}/../.keychain`, { encoding: 'utf8' })
        let keychain = JSON.parse(keychainFile);
        
        // Prompt 
        if (!keyName) {
            keyName = await inquirer.ask("Enter new key name", "Please enter a valid key name")            
        }

        keyName = keyName.trim();

        if (keychain[keyName]) {
            console.log(chalk.yellow.bold(`Key name "${keyName}" already exist`));
            return;
        }

        let keyPwd = '';
        let keyPwdConfirm = '';

        do{
            keyPwd = await inquirer.ask("Enter new password", "Please enter a valid password", true)
            keyPwdConfirm = await inquirer.ask("Confirm new password", "Please enter a valid password", true)
    
            if (keyPwd != keyPwdConfirm) {
                console.log(chalk.yellow.bold(`Passwords does not match...`));
            }
        }
        while(keyPwd != keyPwdConfirm);

        // Prompt keychain key
        const keychainKey = await inquirer.ask("Keychain Password", "Please enter a valid password", true)   

        if (!(await bcrypt.compare(keychainKey, fs.readFileSync(`${__dirname}/../.keychain.keyhash`, { encoding: 'utf8' })))) {
            console.log(`Wrong password...`);
            return;
        }

        const keychainCrypt = new cryptr(keychainKey);

        const hash = keychain[keyName] = keychainCrypt.encrypt(keyPwd);

        if (hash != keychain[keyName]) {
            console.log(chalk.yellow.bold(`Key name error...`));
            return;
        }

        // Write keychain
        fs.writeFileSync(`${__dirname}/../.keychain`, JSON.stringify(keychain, null, 2), { encoding: 'utf8' });

        console.log(chalk.green.bold(`"${keyName}" added!`));
    }

    const _key_remove = async (args) => {
        let keyName = args[0];

        // Read keychain file
        let keychainFile = fs.readFileSync(`${__dirname}/../.keychain`, { encoding: 'utf8' })
        let keychain = JSON.parse(keychainFile);
        
        // Prompt 
        if (!keyName) {
            keyName = await inquirer.ask("Enter new key name", "Please enter a valid key name")            
        }

        keyName = keyName.trim();

        delete keychain[keyName];

        // Prompt Confirm
        if (!(await inquirer.askConfirm(chalk.yellow.bold(`Are you sure you want to remove "${keyName}" key? (y/n)`)))) {
            return;
        }
        
        // Prompt keychain key
        const keychainKey = await inquirer.ask("Keychain Password", "Please enter a valid password", true)   

        if (!(await bcrypt.compare(keychainKey, fs.readFileSync(`${__dirname}/../.keychain.keyhash`, { encoding: 'utf8' })))) {
            console.log(`Wrong password...`);
            return;
        }

        // Write keychain
        fs.writeFileSync(`${__dirname}/../.keychain`, JSON.stringify(keychain, null, 2), { encoding: 'utf8' });

        console.log(chalk.green.bold(`"${keyName}" removed!`));
    }

    const _key_list = async () => {
        // Read keychain file
        const keychainFile = fs.readFileSync(`${__dirname}/../.keychain`, { encoding: 'utf8' })
        const keychain = JSON.parse(keychainFile);

        console.log(chalk.green.bold(`Keychain list:`));

        for (const key in keychain) {
            if (keychain.hasOwnProperty(key)) {
                console.log(`${chalk.blue.bold('> ')}${chalk.blue.bold(key)}`);
            }
        }
    }

    const _key_show = async (args) => {

        const keyName = args[0]

        // Read keychain file
        const keychainFile = fs.readFileSync(`${__dirname}/../.keychain`, { encoding: 'utf8' })
        const keychain = JSON.parse(keychainFile);

        if (!keychain[keyName]) {
            console.log(chalk.yellow.bold(`Key name "${keyName}" not exist`));

            let similar = [];
            for (const key in keychain) {
                if (keychain.hasOwnProperty(key)) {
                    if(similarity(key, keyName) > 0.5){
                        similar.push(key);
                    }
                }
            }
            if (similar.length > 0) {
                console.log(chalk.green.bold(`Similar:`));
                for (let i = 0; i < similar.length; i++) {
                    console.log(`${chalk.blue.bold('> ')}${chalk.blue.bold(similar[i])}`);                    
                }
            }

            return;
        }

        // Read keychain key
        const keychainKey = await inquirer.ask("Keychain Password", "Please enter a valid password", true)   
        
        if (!(await bcrypt.compare(keychainKey, fs.readFileSync(`${__dirname}/../.keychain.keyhash`, { encoding: 'utf8' })))) {
            console.log(chalk.yellow.bold(`Wrong password...`));
            return;
        }

        const keychainCrypt = new cryptr(keychainKey);

        console.log(chalk.green.bold(`"${keyName}" password has been copied to the clipboard!`));
        clipboardy.writeSync(keychainCrypt.decrypt(keychain[keyName]));
    }

    switch (args[0]) {

        case 'init':
            await _key_init(args.splice(1))
            break;

        case 'reset':
            await _key_reset()
            break;

        case 'add':
            await _key_add(args.splice(1))
            break;

        case 'remove':
        case 'rm':
            await _key_remove(args.splice(1))
            break;

        case 'list':
        case 'ls':
            await _key_list(args.splice(1))
            break;
            
        default:
            await _key_show(args)
            break;
    }
}

const menu = async (argv) => {
    let args = argv._;
    delete argv._;
    let params = argv;
    let localConfHelp = 'Usage:';

    dryRun = !!params['mcl-dry-run'];
    delete params['mcl-dry-run'];
    
    crossEnv = !!params['mcl-crossenv'];
    delete params['mcl-crossenv'];
    
    ttyShell = !!params['mcl-tty'];
    delete params['mcl-tty'];
    shellShareVars = !!params['mcl-share-vars'];
    delete params['mcl-share-vars'];
    
    runGlobal = params['g']
    delete params['g'];

    if (!runGlobal && localConf && localConf.scripts) {
        const script = await _process_scripts(args, params, 'local');
        if (script) {
            await _exec_script(script, crossEnv ? params : null, 'local');
            return;
        }

        localConfHelp = `Local:${await printHelp(localConf.scripts, '', 'local')}

    Global:`;
    }

    const script = await _process_scripts(args, params, 'global');
    if (script) {
        await _exec_script(script, crossEnv ? params : null, 'global');
        return;
    }

    switch (args[0]) {

        case 'key':
            await _key(args.splice(1))
            break;

        case 'vbx-usb':
            await _vbx_usb(args.splice(1))
            break;

        case 'ssh':
            await _ssh(args.splice(1))
            break;

        case 'edit-conf':
            await _edit_cli_conf(args.splice(1)[0])
            break;

        case 'init-local':
            await _init_local(args.splice(1)[0])
            break;

        case 'help':
        case 'h':
        default:
            shell.exec(`echo "\\033[0;36m${chalk.bold('>_ mcl')}\\033[0m"`);
            console.log(adjCommentTab(`
    ${localConfHelp}${await printHelp(globalConf.scripts, '', 'local')}
        mcl vbx-usb # Emulate Linux USB env (ionic + docker + android)
        mcl key [init|reset|add|remove|list|<key_name>] # mcl Keychain
        mcl edit-conf ?<editor> # Edit global mcl conf
        mcl init-local      # Init local mcl conf
        mcl help|h
      `))
            break;
    }

}

module.exports = {

    init: async () => {
        const argv = require('minimist')(process.argv.slice(2));
        await menu(argv);
    }
    
};