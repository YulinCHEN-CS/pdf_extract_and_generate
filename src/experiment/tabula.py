import experiment.tabula as tabula
from tabulate import tabulate 

file = "./pdfs/PAPE-2.0-English-test.pdf"

#reading both table as an independent table
tables = tabula.read_pdf(file, pages=1, multiple_tables=True)
print(tables[0])
print(tables[1])