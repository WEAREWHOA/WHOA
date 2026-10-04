-- Close the seeded demo ambassador's login.
--
-- The credentials for WHOA-DEMO15 were printed on the login page, in the
-- README and in a comment in 0002. Taking them off the page stops new
-- people reading them; it does nothing about everybody who already did,
-- and search engines and archives have had the login page for as long as
-- it has existed.
--
-- So the password goes. Nulling the hash rather than deleting the row:
-- getCredentialsByCode only returns a login when a hash is present, so
-- this closes the door while leaving the seeded orders and links intact
-- for anything that still reads them.
--
-- To reopen it later, set a new bcrypt hash on this row and keep the
-- password wherever passwords are kept. Not in a README.

update ambassadors
set password_hash = null
where code = 'WHOA-DEMO15';
