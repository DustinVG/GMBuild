gmbuild = {
	menu_index: -1,
	compiled: false,

	// preferences
	preferences_path: Electron_App.getPath("userData") + "/GMEdit/config/gmbuild-preferences.json",
	preferences_div: document.createElement("div"),
	preferences: {
		compiler_location: "",
		runner_location: "",
		debugger_location: "",
		debugger_xml_location: ""
	},
	preferences_save: function () {
		Electron_FS.writeFileSync(this.preferences_path, JSON.stringify(this.preferences));
	},
	preferences_load: function () {
		return Object.assign(this.preferences, JSON.parse(Electron_FS.readFileSync(this.preferences_path)));
	},

	system_init: function () {
		// load preferences file
		if (Electron_FS.existsSync(this.preferences_path)) {
			this.preferences = this.preferences_load();
		}

		// create div on main ui for YYC (not yet implemented)
		/*div_element = document.createElement("div");
		div_element.innerText = "Use YYC";
		document.getElementById("misc-td").appendChild(div_element);
		
		yyc_checkbox_element = document.createElement("INPUT");
		yyc_checkbox_element.setAttribute("type", "checkbox");
		yyc_checkbox_element.id = "yyc_checkbox";
		div_element.appendChild(yyc_checkbox_element);*/

		div_element = document.createElement("span");
		div_element.innerText = "Use Debugger";
		div_element.style.borderLeft = "1px solid #bbb";
		div_element.style.paddingLeft = "5px";

		document.getElementsByClassName("ace_status-bar")[0].appendChild(div_element);

		debugger_checkbox_element = document.createElement("INPUT");
		debugger_checkbox_element.setAttribute("type", "checkbox");
		debugger_checkbox_element.id = "debug_checkbox";
		div_element.appendChild(debugger_checkbox_element);
	},

	// run
	run: function () {
		if (!gmbuild.compiled) {
			return false;
		}

		const { spawn } = require("child_process");

		// project info
		let projectname = $gmedit["gml.Project"].current.displayName;
		// directories
		let tempdir = Electron_App.getPath("temp");
		let outputdir = tempdir + '/GMEdit/' + projectname + '/output';
		let gamedir = '"' + outputdir + '/' + $gmedit["gml.Project"].current.displayName + '.win' + '"';

		// execute runner
		const runner_process = spawn(gmbuild.preferences.runner_location, ['-game', outputdir + "/" + $gmedit["gml.Project"].current.displayName + ".win"]);

		// debugger
		if (document.getElementById("debug_checkbox").checked) {
			const debugger_process = spawn(gmbuild.preferences.debugger_location,
				['-d', outputdir + "/" + $gmedit["gml.Project"].current.displayName + '.yydebug',
					'-t', '127.0.0.1',
					'-u', gmbuild.preferences.debugger_xml_location,
					'-p', $gmedit["gml.Project"].current.path,
					'-c', "Default",
					'-ac', gmbuild.preferences.compiler_location,
					'-tp', 6502]);

			// send debugger output to dev console
			debugger_process.stdout.on('data', (data) => {
				console.divlog(`DEBUGGER: ${data}`);
			});
		}

		// send runner output to dev console
		runner_process.stdout.on('data', (data) => {
			console.divlog(`RUNNER: ${data}`);
		});

		return true;
	},

	// compile
	build: function (execRunner) {
		gmbuild.compiled = false;

		// save all before building
		for (let tab of $gmedit["ui.ChromeTabs"].impl.tabEls) tab.gmlFile.save();

		const { spawn } = require("child_process");

		// project info
		let projectname = $gmedit["gml.Project"].current.displayName;
		// directories
		let tempdir = Electron_App.getPath("temp");
		let outputdir = tempdir + '/GMEdit/' + projectname + '/output';

		// debug
		let debug_param = '';
		if (document.getElementById("debug_checkbox").checked) {
			debug_param = '/debug';
		}

		// execute compile
		let build_process = spawn(gmbuild.preferences.compiler_location,
			['/c',
				'/m=win',
				debug_param,
				'/config', "Default",
				'/tgt=64',
				'/obob=True',
				'/obpp=False',
				'/obru=True',
				'/obes=False',
				'/i=3',
				'/j=8',
				'/cvm',
				'/tp', 2048,
				'/mv=1',
				'/iv=0',
				'/rv=0',
				'/bv=9999',
				'/gn="' + projectname + '"',
				'/td="' + tempdir + '/GMEdit/' + projectname + '"',
				'/cd', tempdir + '/GMEdit/' + projectname + '/cachedir',
				'/sh=True',
				'/dbgp="6502"',
				'/hip="192.168.1.2"',
				'/hprt="51268"',
				'/o="' + outputdir + '"',
				'"' + $gmedit["gml.Project"].current.path + '"']);

		// send compiler output to dev console
		build_process.stdout.on('data', (data) => {
			console.divlog(`COMPILER: ${data}`);
		});

		// set compile flag to true and optionally execute the runner
		build_process.on('exit', (code) => {
			console.divlog(`COMPILE END: ${code}`);

			gmbuild.compiled = true;
			if (execRunner)
				gmbuild.run();
		});
	},

	// run and compile
	build_and_run: function () {
		gmbuild.build(true);
	},

	ParseDescriptor: function (string) {
		// Parse error descriptor and return object about it!
		let Descriptor = {};
		if (string.startsWith("gml_")) string = string.slice(4);
		Descriptor.Type = string.slice(0, string.indexOf("_"));
		string = string.slice(Descriptor.Type.length + 1);
		Descriptor.Line = parseInt(string.slice(string.lastIndexOf("(") + 1, string.lastIndexOf(")")).replace("line", ""));
		string = string.slice(0, string.lastIndexOf("(")).trim();
		if (Descriptor.Type == "Object") {
			Descriptor.Event = string.slice(string.lastIndexOf("_", string.lastIndexOf("_") - 1) + 1);
			string = string.slice(0, (Descriptor.Event.length * -1) - 1);
		}
		Descriptor.Asset = string;
		return Descriptor;
	},

	GetEvent: function (event) {
		// Turn descriptor event into GMEdit event name! 
		let SubEvent = event.slice(event.lastIndexOf("_") + 1), GmlEvent = $gmedit["parsers.GmlEvent"];
		event = event.slice(0, event.lastIndexOf("_"));
		for (let i = 0; i < GmlEvent.t2sc.length; i++) {
			if (GmlEvent.t2sc[i] == event) {
				return GmlEvent.i2s[i][SubEvent];
			}
		}
		return "";
	}
};

(function () {
	GMEdit.register("gmbuild",
		{
			init: function () {
				gmbuild.system_init();

				// main menu items
				let MainMenu = $gmedit["ui.MainMenu"].menu;
				MainMenu.items.forEach((item, index) => {
					if (item.label.toLowerCase() == "close project") {
						gmbuild.menu_index = ++index + 1;
						MainMenu.insert(index++, new Electron_MenuItem({ type: "separator" }));
						MainMenu.insert(index++, new Electron_MenuItem({ label: "Build and run", accelerator: "F5", enabled: true, click: gmbuild.build_and_run }));
						MainMenu.insert(index, new Electron_MenuItem({ label: "Run last build", accelerator: "F6", enabled: true, click: gmbuild.run }));
					}
				});

				// preferences
				let pref = $gmedit["ui.Preferences"];
				pref.addText(gmbuild.preferences_div, "").innerHTML = "<b>GMBuild Settings</b>";
				pref.addInput(gmbuild.preferences_div, "GMAssetCompiler location", gmbuild.preferences.compiler_location, (value) => { gmbuild.preferences.compiler_location = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Runner location", gmbuild.preferences.runner_location, (value) => { gmbuild.preferences.runner_location = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Debugger location", gmbuild.preferences.debugger_location, (value) => { gmbuild.preferences.debugger_location = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Debugger XML location (optional)", gmbuild.preferences.debugger_xml_location, (value) => { gmbuild.preferences.debugger_xml_location = value; gmbuild.preferences_save(); });
				pref.addButton(gmbuild.preferences_div, "Back", () => { pref.setMenu(pref.menuMain); gmbuild.preferences_save(); });
				let buildMain = pref.buildMain;
				pref.buildMain = function (arguments) {
					let Return = buildMain.apply(this, arguments);
					pref.addButton(Return, "GMBuild Settings", function () {
						pref.setMenu(gmbuild.preferences_div);
					});
					return Return;
				};

				// keyboard shortcuts
				let AceCommands = $gmedit["ace.AceCommands"];
				AceCommands.add({ name: "build", bindKey: "F5", exec: gmbuild.build_and_run }, "Build and run");
				AceCommands.addToPalette({ name: "gmbuild: Compile and run your project", exec: "build", title: "Build and run" });
				AceCommands.add({ name: "run", bindKey: "F6", exec: gmbuild.run }, "Run last build");
				AceCommands.addToPalette({ name: "gmbuild: Run your project", exec: "run", title: "Run" });

				// console window
				var node = document.createElement("div");
				node.style = "height: 256px; overflow: auto; font-family: monospace; white-space: pre";
				node.id = "console_div";
				document.getElementById("ace_container").appendChild(node);

				console.divlog = function (message) {
					var console_div_node = document.getElementById('console_div');
					var inner_node = document.createElement("div");

					if (message.includes("ERROR!!! :: ") == true) {

						let lines = (message.toString()).split("\n");
						for (let _i = 0; _i < lines.length; _i++) {
							let line_string = lines[_i];
							if (line_string.startsWith("stack frame is") == true) {
								let stack_string = lines[_i + 1];

								let Descriptor = {};
								if (stack_string.startsWith("gml_")) stack_string = stack_string.slice(4);
								Descriptor.Type = stack_string.slice(0, stack_string.indexOf("_"));
								stack_string = stack_string.slice(Descriptor.Type.length + 1);
								Descriptor.Line = parseInt(stack_string.slice(stack_string.lastIndexOf("(") + 1, stack_string.lastIndexOf(")")).replace("line", ""));
								stack_string = stack_string.slice(0, stack_string.lastIndexOf("(")).trim();
								if (Descriptor.Type == "Object") {
									Descriptor.Event = stack_string.slice(stack_string.lastIndexOf("_", stack_string.lastIndexOf("_") - 1) + 1);
									stack_string = stack_string.slice(0, (Descriptor.Event.length * -1) - 1);
								}
								Descriptor.Asset = stack_string;

								console.log(Descriptor);

								Stack = Descriptor;

								inner_node.setAttribute("style", "color: #FF8080;");
								inner_node.onclick = function () {

									if ($gmedit["ui.OpenDeclaration"].openLocal(Stack.Asset, Stack.Line) == true) {
										setTimeout(() => {
											let Offset = 0;
											if (Stack.Type == "Object") {
												for (let Event = gmbuild.GetEvent(Stack.Event), k = 0; k < aceEditor.session.getLength(); k++) {
													if (aceEditor.session.getLine(k).startsWith("#event " + Event) == true) {
														Offset = ++k;
														break;
													}
												}
											}
											aceEditor.gotoLine(Stack.Line + Offset);
										}, 10);
									}

								}
							}
						}
					}
					console_div_node.appendChild(inner_node);
					inner_node.innerHTML = message;
					console_div_node.scrollTop = console_div_node.scrollHeight;
				};

				/*if (typeof console != "undefined")
					if (typeof console.log != 'undefined')
						console.olog = console.log;
					else
						console.olog = function () { };

				console.log = function (message) {
					console.olog(message);
					var console_div_node = document.getElementById('console_div');
					console_div_node.innerHTML += message + '<br>';
					console_div_node.scrollTop = console_div_node.scrollHeight;
				};
				
				console.error = console.debug = console.info = console.log;
				*/
			}
		});
})();