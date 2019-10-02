gmbuild =
	{
	menu_index: -1,
	compiled: false,
	
	// preferences
	preferences_path: Electron_App.getPath("userData") + "/GMEdit/config/gmbuild-preferences.json",
	preferences_div: document.createElement("div"),
	preferences:
		{
		compiler_location: "",
		runner_location: ""
		},
	preferences_save: function()
		{
		Electron_FS.writeFileSync(this.preferences_path, JSON.stringify(this.preferences));
		},
	preferences_load: function()
		{
		return Object.assign(this.preferences, JSON.parse(Electron_FS.readFileSync(this.preferences_path)));
		},
	
	system_init: function()
		{
		// load preferences file
        if (Electron_FS.existsSync(this.preferences_path))
			{
            this.preferences = this.preferences_load();
			}
		},
	
	// run
	run: function()
		{
		if (!gmbuild.compiled)
			return false;
		
		const {spawn} = require("child_process");
		
		// project info
		let projectname = $gmedit["gml.Project"].current.displayName;
		// directories
		let tempdir = Electron_App.getPath("temp");
		let outputdir = tempdir+'/GMEdit/'+projectname+'/output';
		let gamedir = '"'+outputdir+'/'+$gmedit["gml.Project"].current.displayName+'.win'+'"';
		
		// execute runner
		const runner_process = spawn(gmbuild.preferences.runner_location,['-game',outputdir+"/"+$gmedit["gml.Project"].current.displayName+".win"]);
		
		// send runner output to dev console
		runner_process.stdout.on('data', (data) => {
			console.log(`RUNNER: ${data}`);
			});
		
		return true;
		},
	// compile
	build: function(execRunner)
		{
		gmbuild.compiled = false;
		
		const {spawn} = require("child_process");
		
		// project info
		let projectname = $gmedit["gml.Project"].current.displayName;
		// directories
		let tempdir = Electron_App.getPath("temp");
		let outputdir = tempdir+'/GMEdit/'+projectname+'/output';
		
		// execute compile
		let build_process = spawn(gmbuild.preferences.compiler_location,
			['/c',
			'/m=win',
			'/config="Default"',
			'/tgt=64',
			'/obob=True',
			'/obpp=False',
			'/obru=True',
			'/obes=False',
			'/i=3',
			'/j=8',
			'/cvm',
			'/tp=2048',
			'/mv=1',
			'/iv=0',
			'/rv=0',
			'/bv=9999',
			'/gn="'+projectname+'"',
			'/td="'+tempdir+'/GMEdit/'+projectname+'"',
			'/cd="'+tempdir+'/GMEdit/'+projectname+'/cachedir"',
			'/sh=True',
			'/dbgp="6502"',
			'/hip="192.168.1.13"',
			'/hprt="51268"',
			'/o="'+outputdir+'"',
			'"'+$gmedit["gml.Project"].current.path+'"']);
		
		// send compiler output to dev console
		build_process.stdout.on('data', (data) => {
			console.log(`COMPILER: ${data}`);
			});
		
		// set compile flag to true and optionally execute the runner
		build_process.on('exit', (code) => {
			console.log(`COMPILE END: ${code}`);
			
			gmbuild.compiled = true;
			if (execRunner)
				gmbuild.run();
			});
		},
	// run and compile
	build_and_run: function()
		{
		gmbuild.build(true);
		}
	};

(function()
	{
    GMEdit.register("gmbuild",
		{
        init: function()
			{
			gmbuild.system_init();
			
            // main menu items
            let MainMenu = $gmedit["ui.MainMenu"].menu;
            MainMenu.items.forEach((item, index) =>
				{
				if (item.label.toLowerCase() == "close project")
					{
					gmbuild.menu_index = ++index + 1;
					MainMenu.insert(index++, new Electron_MenuItem({type: "separator"}));
					MainMenu.insert(index++, new Electron_MenuItem({label: "Build and Run (VM)", accelerator: "F5", enabled: true, click: gmbuild.build_and_run}));
					MainMenu.insert(index,   new Electron_MenuItem({label: "Run (VM)", accelerator: "F6", enabled: true, click: gmbuild.run}));
					}
				});
			
			// preferences
			let pref = $gmedit["ui.Preferences"];
			let buildMain = pref.buildMain;
            pref.buildMain = function(arguments)
				{
                let Return = buildMain.apply(this, arguments);
				let group = pref.addGroup(Return, "GMBuild Settings");
				pref.addInput(group, "GMAssetCompiler Location", gmbuild.preferences.compiler_location, (value) => { gmbuild.preferences.compiler_location = value; gmbuild.preferences_save(); });
				pref.addInput(group, "Runner Location", gmbuild.preferences.runner_location, (value) => { gmbuild.preferences.runner_location = value; gmbuild.preferences_save(); });
                return Return;
				};
			
			// keyboard shortcuts
			let AceCommands = $gmedit["ace.AceCommands"];
            AceCommands.add({ name: "run", bindKey: "F5", exec: gmbuild.build_and_run }, "Build and Run (VM)");
			AceCommands.addToPalette({name: "builder: Compile and run your project", exec: "run", title: "Run"});
			}
		});
	})();