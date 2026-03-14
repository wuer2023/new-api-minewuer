
import mysql.connector

config = {
  'user': 'TEST',
  'password': 'TEST',
  'host': '154.9.26.125',
  'port': 3306,
  'raise_on_warnings': True
}

try:
    cnx = mysql.connector.connect(**config)
    cursor = cnx.cursor()
    cursor.execute("SHOW DATABASES")
    for (db,) in cursor:
        print(db)
    cursor.close()
    cnx.close()
except mysql.connector.Error as err:
    print(err)
