# GMBuild (DEV BUILD)
Debug & Run GMStudio v1.4 projects from within GMEdit

![GMBuild section](https://raw.githubusercontent.com/kbjwes77/GMBuild/master/gmbuild.jpg)

**How To Use** (At this point in time, some additional changes may need to be made for GMBuild to work with your specific hardware/installation)

* Install the plugin and open GMEdit
* Go to preferences and find the GMBuild section
* Fill out the paths to your copies of "GMAssetCompiler.exe" and "Runner.exe"
* Use the context menu "Build and Run (VM)" or press 'F5' to compile and run!

**Planned Features**

* Custom command line arguments for compiler
* Support for compiling with YYC
* ~~Custom runner/compiler output window~~

**Known Issues**

* Doesn't check if a project is loaded or not
* Fails silently if any errors are thrown (use 'Dev Tools' [Ctrl+Shift+I] for debugging)

**Credits**

Thanks to Liam for the initial idea and helping to get things up and running, nommiin for laying a foundation for the structure of this project with [Builder](https://github.com/nommiin/builder), and of course YellowAfterlife for making GMEdit in the first place.
