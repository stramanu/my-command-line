# >_ mcl - My Command Line
A personal generic customizable command line

---

This started as a small personal project (written and used only on macos) but given the great utility I thought I'd make it public.
Maybe with the help of the community it can progress and be more and more useful to more developers.
Thank you ❤️

---

I'm Emanuele Strazzullo

If you have found anything useful and you want to support me, then [Buy me a coffee! :coffee:](https://www.buymeacoffee.com/emastraz)

[buymeacoffee.com](https://www.buymeacoffee.com/emastraz) is a website that contacts developers, designers, artists, etc. with their communities so that people can express appreciation  for their work.

If you want to contribute feel free to do it at [Buy me a coffee! :coffee:](https://www.buymeacoffee.com/emastraz), and many thanks in advance ❤️

For as we well know 

`var code = developer + caffeine`

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/emastraz)

---

Examples:

![demo](https://raw.githubusercontent.com/stramanu/my-command-line/master/demo.gif)
![demo](https://raw.githubusercontent.com/stramanu/my-command-line/master/demo2.gif)
![demo](https://raw.githubusercontent.com/stramanu/my-command-line/master/demo3.gif)

---

### Install
- Clone anywhere then simply run `npm run i`

### Usage
- Run `mcl` to print the help (usage)
- Configure `global-mcl.json` as you like (run `mcl edit-conf` or `mcl edit-conf code`)
- Use `mcl init-local` to create local `mcl.json` conf file. It will extends your global mcl conf.

### Conf file usage (`global-mcl.json` or `mcl.json`)
- Use `script` section of the mcl conf file to define any kind of script
- Use `var` section of the mcl conf file to define variables
- Global variables:
    * `$__dirname`  : Get `__dirname` variable
    * `$__params`   : Get all parameters
    * `$__args`     : Get all arguments
- Arguments as parameter
    * Use `$1` to get the first argument
    * Use `$2` to get the second argument
    * Use `?$1` to specify an optional argument
    * Use `$1$(default_value)` to specify a default argument
- mcl parameters
    * `--mcl-dry-run`       : Dry run
    * `--mcl-share-vars`    : Share mcl vars with a bash/shell script 
        (Ex.: `"cmd_name": ["sh myscript.sh --mcl-share-vars", " # Comment"]`)
    * 
- Comments
    * Ex.: `"cmd_name": ["echo \"example\";", " # Echo \"example\""]`)


