********************************************************************************
*LECTURE 03: EMPIRICAL TOOLS. LIVE ANALYSIS IN CLASS. 1/26/2026
********************************************************************************

********************************************************************************
*CHANGE DIRECTORY TO WHERE THE DATA ARE
********************************************************************************
cd "${dropbox}\ugradteaching\econ131spring26\LectureEmpiricalExercises\Lecture03_empiricaltools_ch03\inclass"

********************************************************************************
*(1) LOAD, EXPLORE, AND CLEAN THE DATA
********************************************************************************
use combined_from1997, clear
*LOOK AT THE DATA
order state fips year smm nox_emit
sort fips year
browse
*UNDERSTAND THE KEY VARAIBLES
summarize state
tabulate year
tabulate smm
*ARE THE DATA UNIQUE ON COUNTY-YEAR-SUMMER?
**YES, THE DATA ARE UNIQUE ON THOSE THREE VARIABLES - YAY!
duplicates report fips year smm
*RENAME VARAIBLES FOR EASE
rename smm summer
rename nox_emit pollution
format pollution %9.0f
*LET'S ANALYZE THE DATA AT THE STATE-YEAR-SUMMER LEVEL
count
collapse (sum) pollution, by(state year summer)
count 
*CREATE A POST-2003 VARIABLE
generate post2003=0
replace post2003=1 if year>=2003
*DROP 1997 FOR SIMPLICITY, SO THAT THERE ARE FIVE YEARS PRE AND FIVE YEARS POST
drop if year==1997
*SAVE
save analysisdata, replace

********************************************************************************
*(2) COMPARE POST-2003 POLLUTION IN TENNESSEE IN SUMMER VERSUS IN WINTER
********************************************************************************
*LOAD POST-2003 TENNESSEE DATA ONLY (NOTE: TENNESSEE IS STATE CODE 47)
use analysisdata, clear
keep if state==47
keep if post2003==1
*LIST THE POLLUTION AMOUNTS BY YEAR IN THE WINTER
list year pollution if summer==0
*LIST THE POLLUTION AMOUNTS BY YEAR IN THE SUMMER
list year pollution if summer==1
*SUMMARIZE THESE FACTS BY PRODUCING THE MEAN AMOUNT FOR SUMMER VERSUS WINTER
tabstat pollution, by(summer)
*DRAW A PRETTY BAR GRAPH WITH THOSE NUMBERS
graph bar pollution, over(summer, relabel(1 "Winter (Unregulated)" 2 "Summer (Regulated)") label(labsize(medlarge))) xsize(3) ///
    asyvars showyvars bargap(70) ///
    bar(1, fcolor(cranberry) lcolor(cranberry)) ///
    bar(2, fcolor(navy) lcolor(navy)) ///
    blabel(bar, format(%9.0f) size(medlarge)) ///
    ytitle("Total NOx Emissions (1000s. Tons)", size(large)) ///
    ylabel(, labsize(medlarge)) ///
    legend(off) ///
    graphregion(color(white)) ///
	title("Tennessee Pollution Post-2003")
graph export TNbargraphpost2003.png, replace as(png)

********************************************************************************
*(3) COMPARE PRE-2003 POLLUTION IN TENNESSEE IN SUMMER VERSUS IN WINTER
********************************************************************************
*LOAD PRE-2003 TENNESSEE DATA ONLY (NOTE: TENNESSEE IS STATE CODE 47)
use analysisdata, clear
keep if state==47
keep if post2003==0
*LIST THE POLLUTION AMOUNTS BY YEAR IN THE WINTER
list year pollution if summer==0
*LIST THE POLLUTION AMOUNTS BY YEAR IN THE SUMMER
list year pollution if summer==1
*SUMMARIZE THESE FACTS BY PRODUCING THE MEAN AMOUNT FOR SUMMER VERSUS WINTER
tabstat pollution, by(summer)
*DRAW A PRETTY BAR GRAPH WITH THOSE NUMBERS
graph bar pollution, over(summer, relabel(1 "Winter (Unregulated)" 2 "Summer (Regulated)") label(labsize(medlarge))) xsize(3) ///
    asyvars showyvars bargap(70) ///
    bar(1, fcolor(cranberry) lcolor(cranberry)) ///
    bar(2, fcolor(navy) lcolor(navy)) ///
    blabel(bar, format(%9.0f) size(medlarge)) ///
    ytitle("Total NOx Emissions (1000s. Tons)", size(large)) ///
    ylabel(, labsize(medlarge)) ///
    legend(off) ///
    graphregion(color(white)) ///
	title("Tennessee Pollution Pre-2003")
graph export TNbargraphpre2003.png, replace as(png)

********************************************************************************
*(4) LET'S USE THOSE FOUR NUMBERS ABOVE TO COMPUTE THE DIFFERENCE-IN-DIFFERENCES
*    ESTIMATE OF THE IMPACT OF THE 2003 POLLUTION CONTROL POLICY ON TENNESSEE
*    SUMMER POLLUTION, USING TWO DIFFERENCES: SUMMER MINUS WINTER, AND POST MINUS PRE
********************************************************************************
*LOAD ALL YEARS FOR TENNESSEE
use analysisdata, clear
keep if state==47
*SUMMARIZE THE MEAN AMOUNT FOR SUMMER VERSUS WINTER, POST VERSUS PRE
table post2003 summer, contents(mean pollution)
*STOP AND DO THE DIFFERENCE IN DIFFERENCES TABLE ON THE CHALKBOARD

********************************************************************************
*(5) CHECK THE PRE-TRENDS! TEST FOR PARALELL PRE-2003 TRENDS
********************************************************************************
*LOAD THE TENNESSEE DATA
use analysisdata, clear
keep if state==47
*RECALL, THE DATA ARE ALREADY AT THE STATE-YEAR-SUMMER LEVEL
sort state summer year
list
*PLOT SUMMER POLUTION OVER TIME AND WINTER POLLUTION OVER TIME
twoway ///
	(connected pollution year if summer==1, ///
		sort lcolor(navy) lwidth(medthick) mcolor(navy) ///
		msymbol(circle) msize(medium)) ///
	(connected pollution year if summer==0, ///
		sort lcolor(cranberry) lwidth(medthick) ///
		mcolor(cranberry) msymbol(square) msize(medium)), ///
	legend(order(1 "Summer" 2 "Winter") ring(0) position(1) col(1) size(medlarge)) ///
	xlabel(1998(1)2007, labsize(medlarge)) ///
	ylabel(, labsize(medlarge)) ///
	ytitle("Total NOx Emissions (1000s. Tons)", size(large)) ///
	xtitle("", size(large)) ///
	graphregion(color(white)) ///
	xline(2002.5, lpattern(shortdash) lcolor(black)) ///
	title("Tennessee Pollution 1998-2007")
graph export mainDDgraph.png, replace as(png)
	
********************************************************************************
*(6) DO PLACEBO TEST: SOME UNAFFECTED STATES (12,32,56)
********************************************************************************
*LOAD THE UNAFFECTED-STATE DATA (PICKING A FEW STATES FOR EASE)
use analysisdata, clear
keep if state==12 | state==32 | state==56
*COLLAPSE DATA TO ONE GROUP OF UNAFFECTED STATES
collapse (mean) pollution, by(year summer)
*PLOT SUMMER POLUTION OVER TIME AND WINTER POLLUTION OVER TIME
twoway ///
    (connected pollution year if summer==1, ///
        sort lcolor(cranberry) lwidth(medthick) lpattern(longdash) ///
        mcolor(cranberry) msymbol(triangle) msize(medium)) ///
    (connected pollution year if summer==0, ///
        sort lcolor(cranberry) lwidth(medthick) lpattern(vshortdash) ///
        mcolor(cranberry) msymbol(diamond) msize(medium)), ///
    legend(order(1 "Summer" 2 "Winter") ring(0) position(1) col(1) size(medlarge)) ///
    xlabel(1998(1)2007, labsize(medlarge)) ///
    ylabel(, labsize(medlarge)) ///
    ytitle("Total NOx Emissions (1000s. Tons)", size(large)) ///
    xtitle("", size(large)) ///
    xline(2002.5, lpattern(shortdash) lcolor(black)) ///
    graphregion(fcolor(white) style(none) color(white) margin(0 2 0 2)) ///
	bgcolor(white) ///
	title("Pollution 1998-2007 in Unaffected States")	
graph export placebotest.png, replace as(png)
