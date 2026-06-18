% Лабораторная работа № 1.1. Раскрутка самоприменимого компилятора
% 11 февраля 2026 г.
% Денис Воронов, ИУ9-62Б

# Цель работы
Целью данной работы является ознакомление с раскруткой самоприменимых
компиляторов на примере модельного компилятора.

# Индивидуальный вариант
Компилятор P5. Заменить запись операции <> на !=.


# Реализация

Различие между файлами `pcom.pas` и `pcom2.pas`:

```diff
--- pcom.pas	2020-02-15 14:28:42.000000000 +0300
+++ pcom2.pas	2026-02-11 17:17:21.091325183 +0300
@@ -364,7 +364,7 @@
                  neop,eqop,inop,noop);
      setofsys = set of symbol;
      chtp = (letter,number,special,illegal,
-             chstrquo,chcolon,chperiod,chlt,chgt,chlparen,chspace,chlcmt);
+        chstrquo,chcolon,chperiod,chlt,chgt,chbang,chlparen,chspace,chlcmt);
      { Here is the variable length string containment to save on space. strings
        strings are only stored in their length rounded to the nearest 10th. }
      strvsp = ^strvs; { pointer to variable length id string }
@@ -1494,11 +1494,32 @@
          until iscmte or (ch = ')') or eof(input);
          if not iscmte then nextch; goto 1
        end;
+      chbang:
+        begin 
+          nextch; 
+          if ch = '=' then
+            begin 
+              sy := relop; 
+              op := neop; 
+              nextch
+            end
+          else
+            begin 
+              error(399); 
+              sy := othersy; 
+              op := noop
+            end
+        end;
       special:
         begin sy := ssy[ch]; op := sop[ch];
           nextch
         end;
       chspace: sy := othersy
+      
+      
+      
     end; (*case*)
 
     if dodmplex then begin {  lexical dump }
@@ -5379,6 +5400,7 @@
       ssy['['] := lbrack ;  ssy[']'] := rbrack;   ssy[':'] := colon;
       ssy['^'] := arrow ;   ssy['<'] := relop;    ssy['>'] := relop;
       ssy[';'] := semicolon; ssy['@'] := arrow;
+      ssy['!'] := relop;     sop['!'] := noop;
     end (*symbols*) ;
 
     procedure rators;
@@ -5488,6 +5510,7 @@
       chartp['<'] := chlt    ; chartp['>'] := chgt    ;
       chartp['{'] := chlcmt  ; chartp['}'] := special ;
       chartp['@'] := special ;
+      chartp['!'] := chbang;
 
       ordint['0'] := 0; ordint['1'] := 1; ordint['2'] := 2;
       ordint['3'] := 3; ordint['4'] := 4; ordint['5'] := 5;
@@ -5635,4 +5658,4 @@
 
   99:
 
-end.
+end.a
```

Различие между файлами `pcom2.pas` и `pcom3.pas`:

```diff
--- pcom2.pas	2026-02-11 17:17:21.091325183 +0300
+++ pcom3.pas	2026-02-11 20:10:07.608100535 +0300
@@ -1400,7 +1400,7 @@
     comptypes := false; { set default is false }
     { Check equal. Aliases of the same type will also be equal. }
-    if fsp1 <> fsp2 then comptypes := true
+    if fsp1 != fsp2 then comptypes := true
     else
       if (fsp1 <> nil) and (fsp2 <> nil) then
         if fsp1^.form = fsp2^.form then
@@ -1600,7 +1600,7 @@
   label 1;
 begin
-  while fcp <> nil do
+  while fcp != nil do
     if strequvf(fcp^.name, id) then goto 1
     else if strltnvf(fcp^.name, id) then fcp := fcp^.rlink
       else fcp := fcp^.llink;
@@ -1620,7 +1620,7 @@
-        while lcp <> nil do begin
+        while lcp != nil do begin
           if strequvf(lcp^.name, id) then
             if lcp^.klass in fidcls then begin disx := disxl; goto 1 end
             else
@@ -1640,7 +1640,7 @@
     searchidne(fidcls, lcp); { perform no error search }
-    if lcp <> nil then goto 1; { found }
+    if lcp != nil then goto 1; { found }
     (*search not successful
      --> procedure simpletype*)
       error(104);
@@ -4101,7 +4101,7 @@
                             begin call(fsys,lcp);
                               with gattr do
                                 begin kind := expr;
-                                  if typtr <> nil then
+                                  if typtr != nil then
                                     if typtr^.form=subrange then
                                       typtr := typtr^.rangetype
                                 end
...
```

# Тестирование

Тестовый пример:

```pascal
program TestNE(output);
begin
  if 1 != 2 then
    writeln('OK: 1 != 2 works')
  else
    writeln('FAIL');
  
  if 2 != 2 then
    writeln('FAIL')
  else
    writeln('OK: 2 != 2 is false')
end.
```

Вывод тестового примера на `stdout`

```
OK: 1 != 2 works
OK: 2 != 2 is false
```

# Вывод
Сумел быстро изменить исходный код компилятора на несколько тысяч строк кода.
Напомнило лабораторные по операционным системам, где тоже требовалось в целой кодовой базе
вставить несколько нужных строк кода. Но непосредственно здесь также сверх описанного сумел
раскрутить исходный компилятор.
