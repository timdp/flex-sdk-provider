const gulp = require('gulp')
const plugins = require('gulp-load-plugins')()
const del = require('del')

gulp.task('clean', function () {
  del.sync('lib')
})

gulp.task('build', function () {
  return gulp.src('src/**/*.js')
    .pipe(plugins.plumber({
      errorHandler: plugins.notify.onError('<%= error.message %>')
    }))
    .pipe(plugins.babel())
    .pipe(gulp.dest('lib'))
})

gulp.task('watch', function () {
  gulp.watch(['src/**/*'], ['build'])
})

gulp.task('default', ['build'], function () {
  gulp.start('watch')
})
