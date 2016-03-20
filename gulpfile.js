var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var install = require("gulp-install");

gulp.task('serve', ['build'], function () {
  nodemon({
    script: 'index.js'
  , ext: 'js html'
  , env: { 'NODE_ENV': 'development' }
  })
});

gulp.task('build', function (){
	gulp.src(['./package.json'])
  	.pipe(install());
});

gulp.task('default', ['build', 'serve']);
