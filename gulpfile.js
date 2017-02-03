var gulp = require('gulp');
var expect = require('gulp-expect-file');
var jshint = require('gulp-jshint');

// gulp-expect-file options.
const EXPECT_OPTIONS = {
	silent: true,
	errorOnFailure: true,
	checkRealFile: true
};

gulp.task('lint', function() {
	var src = ['gulpfile.js', 'app.js'];

	return gulp.src(src)
		.pipe(expect(EXPECT_OPTIONS, src))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});
