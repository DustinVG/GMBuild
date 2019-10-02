# GMBuild
Compile and run GMStudio v1.4 projects in GMEdit

![GMBuild section](https://raw.githubusercontent.com/kbjwes77/GMBuild/master/gmbuild.jpg)

**How To Use**

* Install the plugin and open GMEdit
* Go to preferences and find the GMBuild section
* Fill out the paths to your copies of "GMAssetCompiler.exe" and "Runner.exe"
* Use the context menu "Build and Run (VM)" or press 'F5' to compile and run!

**Planned Features**

* Custom command line arguments for compiler
* Custom runner/compiler output window

**Known Issues**

* Only supports Windows VM target
* Doesn't check if a project is loaded or not
* Fails silently if any errors are thrown (use 'Dev Tools' [Ctrl+Shift+I] for debugging)
