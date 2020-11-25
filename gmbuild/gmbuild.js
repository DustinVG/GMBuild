const { spawn } = require("child_process");

gmbuild = {
	menu_index: -1,
	compiled_without_error: false,
	runner_process: null,
	target_module: "VM",
	has_errors: false,

	// preference option initialization
	preferences_path: Electron_App.getPath("userData") + "/GMEdit/config/gmbuild-preferences.json",
	preferences_div: document.createElement("div"),
	preferences: {
		path_compiler: "",
		path_options: "",
		path_output: "",
		path_runner: "",
		path_webserver: "",
		path_debugger: "",
		path_debug_xml: ""
	},

	preferences_save: function () { Electron_FS.writeFileSync(this.preferences_path, JSON.stringify(this.preferences)); },
	preferences_load: function () { return Object.assign(this.preferences, JSON.parse(Electron_FS.readFileSync(this.preferences_path))); },

	system_init: function () {
		// load preferences file
		if (Electron_FS.existsSync(this.preferences_path)) { this.preferences = this.preferences_load(); }

		// create module type dropdown
		const module_select = document.createElement("select");
		module_select.id = "module_select";
		module_select.style.borderLeft = "1px solid #bbb";
		module_select.style.paddingLeft = "8px";
		const module_span = document.createElement("span");
		module_span.innerText = "Module";
		module_span.style.borderLeft = "1px solid #bbb";
		module_span.style.paddingLeft = "8px";
		document.getElementsByClassName("ace_status-bar")[0].appendChild(module_span);

		let option = document.createElement("option");
		option.innerText = "VM";
		module_select.appendChild(option);
		option = document.createElement("option");
		option.innerText = "YYC";
		module_select.appendChild(option);
		option = document.createElement("option");
		option.innerText = "WEB";
		module_select.appendChild(option);
		module_span.appendChild(module_select);

		// create debugger toggle
		const debugger_span = document.createElement("span");
		debugger_span.innerText = "Use Debugger";
		debugger_span.style.borderLeft = "1px solid #bbb";
		debugger_span.style.paddingLeft = "8px";
		document.getElementsByClassName("ace_status-bar")[0].appendChild(debugger_span);
		debugger_checkbox_element = document.createElement("input");
		debugger_checkbox_element.setAttribute("type", "checkbox");
		debugger_checkbox_element.id = "debug_checkbox";
		debugger_span.appendChild(debugger_checkbox_element);

		// hook into error linter to allow for the checking of errors directly before compiling
		console.log($gmedit["parsers.linter.GmlLinter"].prototype.addError);

		$gmedit["parsers.linter.GmlLinter"].prototype.setError = (function () {
			let cached_function = $gmedit["parsers.linter.GmlLinter"].prototype.setError;

			return function () {

				let result = cached_function.apply(this, arguments); // use .apply() to call it

				gmbuild.has_errors = (this.errorText !== "");
				console.log("Has errors: ", gmbuild.has_errors);

				return result;
			};
		})();

		$gmedit["parsers.linter.GmlLinter"].prototype.addError = (function () {
			let cached_function = $gmedit["parsers.linter.GmlLinter"].prototype.addError;

			return function () {

				let result = cached_function.apply(this, arguments); // use .apply() to call it

				gmbuild.has_errors = gmbuild.has_errors || (this.errors.length > 0);
				console.log("Has errors: ", gmbuild.has_errors);

				return result;
			};
		})();
	},

	// saves all open files and starts the asset compiler
	build: function (execRunner) {

		// setup
		let target_module = document.getElementById("module_select").value; // get module output
		let console_div_node = document.getElementById('console_div');
		console_div_node.innerHTML = ""; // clear output "console"
		gmbuild.compiled = false; // reset successful build compile flag (not working currently)
		if ($gmedit["gml.Project"].current.version.isReady === false) { console.divlog("Can't build without a loaded project."); return false; } // exit if we cant build
		gmbuild.has_errors = false; // clear flag for previous errors
		for (let tab of $gmedit["ui.ChromeTabs"].impl.tabEls) { tab.gmlFile.save(); } // save all before building
		if (gmbuild.has_errors) { return; } // check for errors

		// establish directories
		let projectname = $gmedit["gml.Project"].current.displayName;
		let tempdir = Electron_App.getPath("temp");
		outputdir = gmbuild.preferences.path_output === "" ? tempdir + '/GMEdit/' + projectname + '/output' : gmbuild.preferences.path_output;

		// module parameter switching
		let compile_to_vm = target_module === "YYC" ? '' : '/cvm';
		let llvm_source = target_module === "YYC" ? '' : '/llvmSource="C:/Users/liamn/AppData/Roaming/GameMaker-Studio/YYC"';
		let module_param = '/m=win';
		if (target_module === "YYC") {
			console.log("Using YYC");
			module_param = '/m=llvm-win';
			compile_to_vm = '';
		} else if (target_module === "WEB") {
			console.log("Using HTML5");
			module_param = '/m=html5';
		}
		let debug_param = document.getElementById("debug_checkbox").checked === false ? '' : '/debug';


		// test if options is created
		console.log('/optionsini="' + outputdir + '/options.ini"');

		console.log("Current path_options", gmbuild.preferences.path_options);

		// build param array
		build_params = [];
		if (target_module === "YYC") { build_params.push('/llvmSource="C:/Users/liamn/AppData/Roaming/GameMaker-Studio/YYC"'); };
		build_params.push('/c');
		build_params.push(module_param);
		if (target_module === "WEB") {
			build_params.push(
				'/nodnd',
				'/obfuscate',
				'/wt',
				'/html5folder="assets"',
				'/nocache_html5',
				'/HTMLRunner="C:/Users/liamn/AppData/Roaming/GameMaker-Studio/scripts.html5.zip"');
		}
		build_params.push(debug_param);
		build_params.push('/config="Default"');
		build_params.push('/tgt=64');
		build_params.push('/obob=True');
		build_params.push('/obpp=False');
		build_params.push('/obru=True');
		build_params.push('/obes=False');
		build_params.push('/i=3');
		build_params.push('/j=8');
		build_params.push(compile_to_vm);
		build_params.push('/tp=2048');
		build_params.push('/mv=1');
		build_params.push('/iv=0');
		build_params.push('/rv=0');
		build_params.push('/bv=9999');
		build_params.push('/gn="' + projectname + '"');
		build_params.push('/td="' + tempdir + '/GMEdit/' + projectname + '"');
		build_params.push('/cd', tempdir + '/GMEdit/' + projectname + '/cachedir');
		build_params.push('/sh=True');
		build_params.push('/dbgp="6502"');
		build_params.push('/hip="192.168.1.184"');
		build_params.push('/hprt="51268"');
		build_params.push('/optionsini="' + gmbuild.preferences.path_options + '"');
		build_params.push('/o="' + outputdir + '"');
		build_params.push('"' + $gmedit["gml.Project"].current.path + '"');

		// execute compile
		gmbuild.compiled_without_error = true;
		let build_process = spawn(gmbuild.preferences.compiler_location, build_params);

		// send compiler output to dev console
		build_process.stdout.on('data', (data) => {
			if (data.includes("Error : ")) {
				console.divlog(`<span style="color: red">COMPILER: ${data}<span>`);
				gmbuild.compiled_without_error = false;
				build_process.kill();
			} else {
				console.divlog(`COMPILER: ${data}`);
			}
		});

		// set compile flag to true and optionally execute the runner
		build_process.on('exit', (code) => {
			console.divlog(`COMPILER EXIT CODE: ${code}`);

			if (execRunner && gmbuild.compiled_without_error) {
				gmbuild.run();
			} else if (!gmbuild.compiled_without_error) {
				console.divlog(`<span style="color: yellow">There was a compiler error. Please check the compile log.<span>`);
			}
		});
	},

	// runs the application
	run: function () {

		// setup
		let target_module = document.getElementById("module_select").value;

		// if not compiled yet, do not allow running
		if (gmbuild.compiled_without_error !== true) {
			console.divlog(`<span style="color: yellow">It appears that you have yet to successfully compile the game.<span>`);
			return false;
		}

		// project info
		//let projectname = $gmedit["gml.Project"].current.displayName;
		// directories
		//let tempdir = Electron_App.getPath("temp");
		//let outputdir = tempdir + '/GMEdit/' + projectname + '/output';
		//let gamedir = '"' + outputdir + '/' + $gmedit["gml.Project"].current.displayName + '.win' + '"';

		// establish directories
		let projectname = $gmedit["gml.Project"].current.displayName;
		let tempdir = Electron_App.getPath("temp");
		outputdir = gmbuild.preferences.path_output === "" ? tempdir + '/GMEdit/' + projectname + '/output' : gmbuild.preferences.path_output;

		// if a running process exists, kill it
		if (gmbuild.runner_process !== null) {
			gmbuild.runner_process.kill();
			delete runner_process;
		}

		switch (target_module) {
			case "VM":
				console.divlog("Running executable from " + outputdir + "/" + $gmedit["gml.Project"].current.displayName + ".win");
				gmbuild.runner_process = spawn(gmbuild.preferences.path_runner, ['-game', outputdir + "/" + $gmedit["gml.Project"].current.displayName + ".win"]);

				// debugger
				if (document.getElementById("debug_checkbox").checked === true) {
					const debugger_process = spawn(gmbuild.preferences.path_debugger,
						['-d', outputdir + "/" + $gmedit["gml.Project"].current.displayName + '.yydebug',
							'-t', '127.0.0.1',
							'-u', gmbuild.preferences.path_debug_xml,
							'-p', $gmedit["gml.Project"].current.path,
							'-c', "Default",
							'-ac', gmbuild.preferences.path_compiler,
							'-tp', 6502]);

					// send debugger output to dev console
					debugger_process.stdout.on('data', (data) => {
						console.divlog(`DEBUGGER: ${data}`);
					});
				}
				break;
			case "YYC":
				console.divlog("Running executable from " + outputdir + "/" + $gmedit["gml.Project"].current.displayName.replace(/ /g, "_") + ".exe");
				gmbuild.runner_process = spawn(outputdir + "/" + $gmedit["gml.Project"].current.displayName.replace(/ /g, "_") + ".exe");
				break;
			case "WEB":
				console.log("Opening webserver", gmbuild.preferences.path_webserver);
				gmbuild.runner_process = spawn(gmbuild.preferences.path_webserver, ["--folder", outputdir + '/']);
				break;
		}

		// send runner output to dev console
		gmbuild.runner_process.stdout.on('data', (data) => {
			console.divlog(`RUNNER: ${data}`);
		});

		return true;
	},

	ParseDescriptor: function (string) {
		// Parse error descriptor and return object about it!
		let Descriptor = {};
		if (string.startsWith("gml_")) string = string.slice(4);
		Descriptor.Type = string.slice(0, string.indexOf("_"));
		string = string.slice(Descriptor.Type.length + 1);
		Descriptor.Line = parseInt(string.slice(string.lastIndexOf("(") + 1, string.lastIndexOf(")")).replace("line", ""));
		string = string.slice(0, string.lastIndexOf("(")).trim();
		if (Descriptor.Type === "Object") {
			Descriptor.Event = string.slice(string.lastIndexOf("_", string.lastIndexOf("_") - 1) + 1);
			string = string.slice(0, (Descriptor.Event.length * -1) - 1);
		}
		Descriptor.Asset = string;
		return Descriptor;
	},

	GetEvent: function (event) {

		let SubEvent = event.slice(event.lastIndexOf("_") + 1);
		let GmlEvent = $gmedit["parsers.GmlEvent"];
		event = event.slice(0, event.lastIndexOf("_"));

		switch (event) {
			case "CreateEvent": return "create";
			case "DestroyEvent": return "destroy";
			case "Alarm": return "alarm" + real(SubEvent);
			case "OtherGameStart": return "other_game_start";
			case "StepNormalEvent": return "step";
			default: console.warn(`No event found for event ${event}`);
				return "";
		}

		// Turn descriptor event into GMEdit event name!
		/*let SubEvent = event.slice(event.lastIndexOf("_") + 1);
		let GmlEvent = $gmedit["parsers.GmlEvent"];
		event = event.slice(0, event.lastIndexOf("_"));
		for (let i = 0; i < GmlEvent.t2sc.length; i++) {
			if (GmlEvent.t2sc[i] === event) {
				return GmlEvent.i2s[i][SubEvent];
			}
		}*/

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
					if (item.label.toLowerCase() === "close project") {
						gmbuild.menu_index = ++index + 1;
						MainMenu.insert(index++, new Electron_MenuItem({ type: "separator" }));
						MainMenu.insert(index++, new Electron_MenuItem({ label: "Build and run", accelerator: "F5", enabled: true, click: gmbuild.build_and_run }));
						MainMenu.insert(index, new Electron_MenuItem({ label: "Run last build", accelerator: "F6", enabled: true, click: gmbuild.run }));
					}
				});

				// preferences - add gmbuild settings button
				let pref = $gmedit["ui.Preferences"];
				let buildMain = pref.buildMain;
				pref.buildMain = function (arguments) {
					let Return = buildMain.apply(this, arguments);
					pref.addButton(Return, "GMBuild Settings", function () {
						pref.setMenu(gmbuild.preferences_div);
					});
					return Return;
				};

				// preferences - add inputs
				pref.addText(gmbuild.preferences_div, "").innerHTML = "<b>GMBuild Settings</b>";
				pref.addInput(gmbuild.preferences_div, "GMAssetCompiler location", gmbuild.preferences.path_compiler, (value) => { gmbuild.preferences.path_compiler = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Options location `options.ini` (required for YYC)", gmbuild.preferences.path_options, (value) => { gmbuild.preferences.path_options = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Output location", gmbuild.preferences.path_output, (value) => { gmbuild.preferences.path_output = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "VM Runner location", gmbuild.preferences.path_runner, (value) => { gmbuild.preferences.path_runner = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "HTML5 web server location", gmbuild.preferences.path_webserver, (value) => { gmbuild.preferences.path_webserver = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Debugger location", gmbuild.preferences.path_debugger, (value) => { gmbuild.preferences.path_debugger = value; gmbuild.preferences_save(); });
				pref.addInput(gmbuild.preferences_div, "Debugger XML location (optional)", gmbuild.preferences.path_debug_xml, (value) => { gmbuild.preferences.path_debug_xml = value; gmbuild.preferences_save(); });
				pref.addButton(gmbuild.preferences_div, "Save Changes", () => { pref.setMenu(pref.menuMain); gmbuild.preferences_save(); });

				// keyboard shortcuts
				let AceCommands = $gmedit["ace.AceCommands"];
				AceCommands.add({ name: "build", bindKey: "F5", exec: function () { gmbuild.build(true); } }, "Build and run");
				AceCommands.addToPalette({ name: "gmbuild: Compile and run your project", exec: "build", title: "Build and run" });
				AceCommands.add({ name: "run", bindKey: "F6", exec: gmbuild.run }, "Run last build");
				AceCommands.addToPalette({ name: "gmbuild: Run your last build of your project.", exec: "run", title: "Run last build" });

				// console window
				let node = document.createElement("div");
				node.style = "height: 256px; overflow: auto; font-family: monospace; white-space: pre";
				node.id = "console_div";
				document.getElementById("ace_container").appendChild(node);

				// divlog function for logging runner and debugger
				console.divlog = function (message) {
					let console_div_node = document.getElementById('console_div');
					let inner_node = document.createElement("div");

					if (message.includes("ERROR!!! :: ") === true) {

						let lines = (message.toString()).split("\n");
						for (let _i = 0; _i < lines.length; _i++) {
							let line_string = lines[_i];
							if (line_string.startsWith("stack frame is") === true) {
								let stack_string = lines[_i + 1]; // stack_string = gml_Object_obj_menu_StepNormalEvent_1 (line 45);

								let Descriptor = {};
								if (stack_string.startsWith("gml_")) stack_string = stack_string.slice(4); // stack_string <= Object_obj_menu_StepNormalEvent_1 (line 45);
								Descriptor.Type = stack_string.slice(0, stack_string.indexOf("_")); // Descriptor.Type <= Object
								stack_string = stack_string.slice(Descriptor.Type.length + 1); // stack_string <= obj_menu_StepNormalEvent_1 (line 45);
								Descriptor.Line = parseInt(stack_string.slice(stack_string.lastIndexOf("(") + 1, stack_string.lastIndexOf(")")).replace("line", "")); // Descriptor.Line <= 45;
								stack_string = stack_string.slice(0, stack_string.lastIndexOf("(")).trim(); // stack_string <= obj_menu_StepNormalEvent_1
								if (Descriptor.Type === "Object") {
									let _underscore_last_index = stack_string.lastIndexOf("_");
									let _underscore_beforelast_index = stack_string.lastIndexOf("_", _underscore_last_index - 1);
									Descriptor.Event = stack_string.slice(_underscore_beforelast_index + 1); // Descriptor.Event <= StepNormalEvent_1
									stack_string = stack_string.slice(0, (Descriptor.Event.length * -1) - 1); // stack_string <= obj_menu
								}
								Descriptor.Asset = stack_string; // Descriptor.Asset <= obj_menu

								console.log(Descriptor);

								Stack = Descriptor;

								// set styling and click function for error div
								inner_node.setAttribute("style", "color: #FF8080;");
								inner_node.onclick = () => {

									let Offset = 0;
									if (Stack.Type == "Object") {
										let Event = gmbuild.GetEvent(Stack.Event);
										console.log(`Event: ${Event}`);


										// loop through all lines of open document
										for (k = 0; k < aceEditor.session.getLength(); k++) {
											if (aceEditor.session.getLine(k).startsWith("#event " + Event) === true) {
												Offset = ++k;
												break;
											}
										}
									}
									aceEditor.scrollToLine(Stack.Line + Offset,true,true,null);
								}

							}
						}
					}
					console_div_node.appendChild(inner_node);
					inner_node.innerHTML = message;
					console_div_node.scrollTop = console_div_node.scrollHeight;
				};

				/*if (typeof console !== "undefined")
					if (typeof console.log !== 'undefined')
						console.olog = console.log;
					else
						console.olog = function () { };
	
				console.log = function (message) {
					console.olog(message);
					let console_div_node = document.getElementById('console_div');
					console_div_node.innerHTML += message + '<br>';
					console_div_node.scrollTop = console_div_node.scrollHeight;
				};
	
				console.error = console.debug = console.info = console.log;
				*/
			}
		});
})();