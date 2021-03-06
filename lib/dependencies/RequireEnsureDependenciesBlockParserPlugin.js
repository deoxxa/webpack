/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireEnsureDependenciesBlock = require("./RequireEnsureDependenciesBlock");
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
var getFunctionExpression = require("./getFunctionExpression");

module.exports = AbstractPlugin.create({
	"call require.ensure": function(expr) {
		var chunkName = null, chunkNameRange = null;
		switch(expr.arguments.length) {
		case 3:
			var chunkNameExpr = this.evaluateExpression(expr.arguments[2]);
			if(!chunkNameExpr.isString()) return;
			chunkNameRange = chunkNameExpr.range;
			chunkName = chunkNameExpr.string;
			// fall through
		case 2:
			var dependencies = null;
			var dependenciesExpr = this.evaluateExpression(expr.arguments[0]);
			if(!dependenciesExpr.isArray()) return;
			var fnExpressionArg = expr.arguments[1];
			var fnExpression = getFunctionExpression(fnExpressionArg);

			if(fnExpression) {
				this.walkExpressions(fnExpression.expressions);
			}

			var dep = new RequireEnsureDependenciesBlock(expr, fnExpression ? fnExpression.fn : fnExpressionArg, chunkName, chunkNameRange, this.state.module, expr.loc);
			var old = this.state.current;
			this.state.current = dep;
			try {
				var failed = false;
				this.inScope([], function() {
					dependenciesExpr.items.forEach(function(ee) {
						if(ee.isString()) {
							var edep = new RequireEnsureItemDependency(ee.string, ee.range);
							edep.loc = dep.loc;
							dep.addDependency(edep);
						} else {
							failed = true;
						}
					});
				});
				if(failed) {
					return;
				}
				if(fnExpression) {
					if(fnExpression.fn.body.type === "BlockStatement")
						this.walkStatement(fnExpression.fn.body);
					else
						this.walkExpression(fnExpression.fn.body);
				}
				old.addBlock(dep);
			} finally {
				this.state.current = old;
			}
			if(!fnExpression) {
				this.walkExpression(fnExpressionArg);
			}
			return true;
		}
	}
});

